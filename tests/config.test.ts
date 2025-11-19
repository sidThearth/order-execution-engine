import { config } from '../src/config';

describe('Configuration', () => {
    test('should load server configuration with defaults', () => {
        expect(config.server).toBeDefined();
        expect(config.server.port).toBeDefined();
        expect(typeof config.server.port).toBe('number');
        expect(config.server.host).toBeDefined();
    });

    test('should load queue configuration', () => {
        expect(config.queue).toBeDefined();
        expect(config.queue.maxConcurrentOrders).toBeGreaterThan(0);
        expect(config.queue.ordersPerMinute).toBeGreaterThan(0);
        expect(config.queue.maxRetryAttempts).toBeGreaterThan(0);
    });

    test('should load Redis configuration', () => {
        expect(config.redis).toBeDefined();
        expect(config.redis.host).toBeDefined();
        expect(config.redis.port).toBeGreaterThan(0);
    });

    test('should load PostgreSQL configuration', () => {
        expect(config.postgres).toBeDefined();
        expect(config.postgres.host).toBeDefined();
        expect(config.postgres.port).toBeGreaterThan(0);
        expect(config.postgres.database).toBeDefined();
    });

    test('should load mock configuration', () => {
        expect(config.mock).toBeDefined();
        expect(config.mock.executionDelayMs).toBeGreaterThan(0);
        expect(config.mock.quoteDelayMs).toBeGreaterThan(0);
    });
});
