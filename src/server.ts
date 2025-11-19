import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import corsPlugin from '@fastify/cors';
import { config } from './config';
import { MockDexRouter } from './dex/MockDexRouter';
import { DatabaseService } from './db/DatabaseService';
import { RedisService } from './db/RedisService';
import { WebSocketManager } from './websocket/WebSocketManager';
import { OrderQueue } from './queue/OrderQueue';
import { OrderProcessor } from './queue/OrderProcessor';
import orderRoutes from './routes/orders';

async function startServer() {
    // Initialize Fastify
    const fastify = Fastify({
        logger: {
            level: config.server.nodeEnv === 'production' ? 'info' : 'debug'
        }
    });

    // Register plugins
    await fastify.register(corsPlugin, {
        origin: true // Allow all origins (configure for production)
    });

    await fastify.register(websocketPlugin);

    // Initialize services
    const dexRouter = new MockDexRouter();
    const dbService = new DatabaseService();
    const redisService = new RedisService();
    const wsManager = new WebSocketManager();
    const orderQueue = new OrderQueue();

    // Initialize database schema
    try {
        await dbService.initialize();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }

    // Start order processor
    const orderProcessor = new OrderProcessor(dexRouter, dbService, wsManager);

    // Start WebSocket heartbeat
    wsManager.startHeartbeat();

    // Register routes
    await fastify.register(orderRoutes, {
        prefix: '/api/orders',
        orderQueue,
        wsManager
    } as any);

    // Root route for convenience
    fastify.get('/', async () => {
        return {
            name: 'Order Execution Engine API',
            status: 'running',
            version: '1.0.0',
            endpoints: {
                health: '/health',
                execute_order: 'POST /api/orders/execute',
                metrics: '/api/orders/metrics',
                websocket: 'ws://localhost:3000/api/orders/ws/:orderId'
            }
        };
    });

    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Graceful shutdown
    const shutdown = async () => {
        console.log('Shutting down gracefully...');

        await orderProcessor.close();
        await orderQueue.close();
        await dbService.close();
        await redisService.close();
        await fastify.close();

        console.log('Shutdown complete');
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Start server
    try {
        await fastify.listen({
            port: config.server.port,
            host: config.server.host
        });

        console.log(`
    🚀 Order Execution Engine running!
    
    Server: http://${config.server.host}:${config.server.port}
    Health: http://${config.server.host}:${config.server.port}/health
    Metrics: http://${config.server.host}:${config.server.port}/api/orders/metrics
    
    Environment: ${config.server.nodeEnv}
    Max Concurrent Orders: ${config.queue.maxConcurrentOrders}
    Rate Limit: ${config.queue.ordersPerMinute} orders/minute
    `);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Start the server
startServer();
