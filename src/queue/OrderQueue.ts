import { Queue, QueueOptions } from 'bullmq';
import { config } from '../config';
import { CreateOrderRequest } from '../types';

/**
 * BullMQ queue for order processing
 */
export class OrderQueue {
    private queue: Queue;

    constructor() {
        const queueOptions: QueueOptions = {
            connection: config.redis,
            defaultJobOptions: {
                attempts: config.queue.maxRetryAttempts,
                backoff: {
                    type: 'exponential',
                    delay: 2000 // Start with 2 second delay
                },
                removeOnComplete: {
                    count: 100, // Keep last 100 completed jobs
                    age: 24 * 3600 // Remove after 24 hours
                },
                removeOnFail: {
                    count: 100 // Keep last 100 failed jobs
                }
            }
        };

        this.queue = new Queue('order-execution', queueOptions);

        console.log('Order queue initialized');
    }

    /**
     * Add order to queue
     */
    async addOrder(orderId: string, orderData: CreateOrderRequest): Promise<void> {
        await this.queue.add(
            'execute-order',
            {
                orderId,
                ...orderData
            },
            {
                jobId: orderId // Use orderId as job ID for idempotency
            }
        );

        console.log(`Order ${orderId} added to queue`);
    }

    /**
     * Get queue metrics
     */
    async getMetrics() {
        const [waiting, active, completed, failed] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount()
        ]);

        return {
            waiting,
            active,
            completed,
            failed,
            total: waiting + active
        };
    }

    /**
     * Close queue connection
     */
    async close(): Promise<void> {
        await this.queue.close();
    }

    /**
     * Get the underlying BullMQ queue instance
     */
    getQueue(): Queue {
        return this.queue;
    }
}
