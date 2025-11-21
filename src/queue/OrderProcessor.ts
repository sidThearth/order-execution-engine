import { Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { Order, OrderStatus, OrderType, ExecutionResult } from '../types';
import { MockDexRouter } from '../dex/MockDexRouter';
import { DatabaseService } from '../db/DatabaseService';
import { WebSocketManager } from '../websocket/WebSocketManager';

/**
 * Order processor worker handling order execution lifecycle
 */
export class OrderProcessor {
    private worker: Worker;
    private dexRouter: MockDexRouter;
    private dbService: DatabaseService;
    private wsManager: WebSocketManager;

    constructor(
        dexRouter: MockDexRouter,
        dbService: DatabaseService,
        wsManager: WebSocketManager
    ) {
        this.dexRouter = dexRouter;
        this.dbService = dbService;
        this.wsManager = wsManager;

        this.worker = new Worker(
            'order-execution',
            async (job: Job) => await this.processOrder(job),
            {
                connection: config.redis,
                concurrency: config.queue.maxConcurrentOrders,
                limiter: {
                    max: config.queue.ordersPerMinute,
                    duration: 60000 // per minute
                }
            }
        );

        this.setupEventListeners();

        console.log(`Order processor started with ${config.queue.maxConcurrentOrders} concurrent workers`);
    }

    /**
     * Process an order through its full lifecycle
     */
    private async processOrder(job: Job): Promise<void> {
        const { orderId, userId, orderType, tokenIn, tokenOut, amountIn, slippage = 1 } = job.data;

        try {
            // Status: PENDING
            await this.updateStatus(orderId, OrderStatus.PENDING, 'Order received and queued');

            // Give client time to connect to WebSocket
            await this.sleep(500);

            // Create order record if it doesn't exist (idempotency for retries)
            const existingOrder = await this.dbService.getOrder(orderId);
            if (!existingOrder) {
                const order: Order = {
                    orderId,
                    userId,
                    orderType: orderType as OrderType,
                    tokenIn,
                    tokenOut,
                    amountIn,
                    slippage,
                    status: OrderStatus.PENDING,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await this.dbService.saveOrder(order);
            }

            // Status: ROUTING
            await this.updateStatus(orderId, OrderStatus.ROUTING, 'Comparing DEX prices');

            // Fetch quotes from both DEXs
            const { bestQuote, raydiumQuote, meteoraQuote } = await this.dexRouter.getBestQuote(
                tokenIn,
                tokenOut,
                amountIn
            );

            console.log(`Order ${orderId} routing decision:`, {
                raydium: { price: raydiumQuote.effectivePrice, output: raydiumQuote.estimatedOutput },
                meteora: { price: meteoraQuote.effectivePrice, output: meteoraQuote.estimatedOutput },
                selected: bestQuote.dex
            });

            // Status: BUILDING
            await this.updateStatus(
                orderId,
                OrderStatus.BUILDING,
                `Building transaction for ${bestQuote.dex}`
            );
            await this.sleep(500); // Simulate transaction building

            // Status: SUBMITTED
            await this.updateStatus(orderId, OrderStatus.SUBMITTED, 'Transaction submitted to network');

            // Execute swap
            const execution = await this.dexRouter.executeSwap(
                bestQuote.dex,
                tokenIn,
                tokenOut,
                amountIn,
                slippage
            );

            // Status: CONFIRMED
            const executionResult: ExecutionResult = {
                orderId,
                txHash: execution.txHash,
                executedPrice: execution.executedPrice,
                amountOut: execution.amountOut,
                dexUsed: bestQuote.dex,
                executedAt: new Date()
            };

            await this.dbService.saveExecutionResult(executionResult);
            await this.dbService.updateOrderStatus(orderId, OrderStatus.CONFIRMED);

            await this.updateStatus(
                orderId,
                OrderStatus.CONFIRMED,
                'Order executed successfully',
                executionResult
            );

            console.log(`Order ${orderId} completed successfully:`, executionResult);

        } catch (error: any) {
            // Status: FAILED
            console.error(`Order ${orderId} failed:`, error.message);

            await this.dbService.updateOrderStatus(orderId, OrderStatus.FAILED);
            await this.dbService.saveExecutionResult(
                {
                    orderId,
                    txHash: '',
                    executedPrice: 0,
                    amountOut: 0,
                    dexUsed: null as any,
                    executedAt: new Date()
                },
                error.message
            );

            await this.updateStatus(
                orderId,
                OrderStatus.FAILED,
                'Order execution failed',
                undefined,
                error.message
            );

            throw error; // Re-throw to trigger BullMQ retry
        }
    }

    /**
     * Send status update via WebSocket
     */
    private async updateStatus(
        orderId: string,
        status: OrderStatus,
        message: string,
        data?: Partial<ExecutionResult>,
        error?: string
    ): Promise<void> {
        this.wsManager.sendStatusUpdate(orderId, {
            orderId,
            status,
            timestamp: new Date(),
            message,
            data,
            error
        });
    }

    /**
     * Set up event listeners for worker
     */
    private setupEventListeners(): void {
        this.worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed`);
        });

        this.worker.on('failed', (job, err) => {
            console.error(`Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
        });

        this.worker.on('error', (err) => {
            console.error('Worker error:', err);
        });
    }

    /**
     * Close worker
     */
    async close(): Promise<void> {
        await this.worker.close();
    }

    /**
     * Utility sleep function
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
