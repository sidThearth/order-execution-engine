import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { CreateOrderRequest, CreateOrderResponse, OrderType, OrderStatus } from '../types';
import { OrderQueue } from '../queue/OrderQueue';
import { WebSocketManager } from '../websocket/WebSocketManager';
import type { WebSocket } from 'ws';

const createOrderSchema = {
    body: {
        type: 'object',
        required: ['userId', 'orderType', 'tokenIn', 'tokenOut', 'amountIn'],
        properties: {
            userId: { type: 'string' },
            orderType: { type: 'string', enum: ['MARKET', 'LIMIT', 'SNIPER'] },
            tokenIn: { type: 'string' },
            tokenOut: { type: 'string' },
            amountIn: { type: 'number', minimum: 0 },
            slippage: { type: 'number', minimum: 0, maximum: 100 }
        }
    }
};

export default async function orderRoutes(
    fastify: FastifyInstance,
    opts: {
        orderQueue: OrderQueue;
        wsManager: WebSocketManager;
    }
) {
    const { orderQueue, wsManager } = opts;

    /**
     * POST /api/orders/execute - Submit order and upgrade to WebSocket
     */
    fastify.post<{ Body: CreateOrderRequest }>(
        '/api/orders/execute',
        { schema: createOrderSchema },
        async (request: FastifyRequest<{ Body: CreateOrderRequest }>, reply: FastifyReply) => {
            const orderRequest = request.body;
            const orderId = uuidv4();

            try {
                // Add order to queue
                await orderQueue.addOrder(orderId, orderRequest);

                const response: CreateOrderResponse = {
                    orderId,
                    status: OrderStatus.PENDING,
                    message: 'Order submitted successfully'
                };

                return reply.code(200).send(response);

            } catch (error: any) {
                fastify.log.error('Error submitting order:', error);
                return reply.code(500).send({
                    error: 'Failed to submit order',
                    message: error.message
                });
            }
        }
    );

    /**
     * WebSocket /api/orders/ws/:orderId - Stream order status updates
     */
    fastify.register(async function (fastify) {
        fastify.get(
            '/ws/:orderId',
            { websocket: true },
            (connection: any, request: FastifyRequest<{ Params: { orderId: string } }>) => {
                const { orderId } = request.params;
                const ws: WebSocket = connection.socket;

                // Register WebSocket connection
                wsManager.registerConnection(orderId, ws);

                // Send initial connection confirmation
                ws.send(JSON.stringify({
                    orderId,
                    status: 'connected',
                    timestamp: new Date(),
                    message: 'WebSocket connected successfully'
                }));

                fastify.log.info(`WebSocket connected for order: ${orderId}`);

                ws.on('close', () => {
                    fastify.log.info(`WebSocket closed for order: ${orderId}`);
                });

                ws.on('error', (error: Error) => {
                    fastify.log.error(error, `WebSocket error for order ${orderId}`);
                });
            }
        );
    });

    /**
     * GET /api/orders/metrics - Get queue metrics
     */
    fastify.get('/api/orders/metrics', async (request, reply) => {
        const metrics = await orderQueue.getMetrics();
        return reply.send({
            ...metrics,
            activeConnections: wsManager.getActiveConnections()
        });
    });
}
