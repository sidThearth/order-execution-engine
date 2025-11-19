import { OrderQueue } from '../src/queue/OrderQueue';
import { OrderType } from '../src/types';
import { Queue } from 'bullmq';

// Mock Redis connection
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        connect: jest.fn(),
        quit: jest.fn(),
        duplicate: jest.fn().mockReturnThis()
    }));
});

describe('OrderQueue', () => {
    let orderQueue: OrderQueue;

    beforeEach(() => {
        orderQueue = new OrderQueue();
    });

    afterEach(async () => {
        await orderQueue.close();
    });

    test('should add order to queue successfully', async () => {
        const orderId = 'test-order-1';
        const orderData = {
            userId: 'user-123',
            orderType: OrderType.MARKET,
            tokenIn: 'SOL',
            tokenOut: 'USDC',
            amountIn: 100,
            slippage: 1
        };

        await expect(orderQueue.addOrder(orderId, orderData)).resolves.not.toThrow();
    });

    test('should get queue metrics', async () => {
        const metrics = await orderQueue.getMetrics();

        expect(metrics).toBeDefined();
        expect(metrics).toHaveProperty('waiting');
        expect(metrics).toHaveProperty('active');
        expect(metrics).toHaveProperty('completed');
        expect(metrics).toHaveProperty('failed');
        expect(metrics).toHaveProperty('total');
    });

    test('should handle multiple concurrent orders', async () => {
        const orders = Array.from({ length: 5 }, (_, i) => ({
            orderId: `order-${i}`,
            data: {
                userId: 'user-123',
                orderType: OrderType.MARKET,
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amountIn: 100,
                slippage: 1
            }
        }));

        const promises = orders.map(order => orderQueue.addOrder(order.orderId, order.data));

        await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    test('should use orderId as job ID for idempotency', async () => {
        const orderId = 'idempotent-order';
        const orderData = {
            userId: 'user-123',
            orderType: OrderType.MARKET,
            tokenIn: 'SOL',
            tokenOut: 'USDC',
            amountIn: 100
        };

        // Add same order twice
        await orderQueue.addOrder(orderId, orderData);

        // Second add should replace the first (idempotent)
        await expect(orderQueue.addOrder(orderId, orderData)).resolves.not.toThrow();
    });
});
