import dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL if provided (Railway/Render format)
function parsePostgresConfig() {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
        // Parse postgres://user:password@host:port/database
        try {
            const url = new URL(databaseUrl);
            return {
                host: url.hostname,
                port: parseInt(url.port || '5432', 10),
                database: url.pathname.slice(1), // Remove leading /
                user: url.username,
                password: url.password,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
            };
        } catch (error) {
            console.error('Failed to parse DATABASE_URL:', error);
        }
    }

    // Fallback to individual environment variables
    return {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.POSTGRES_DB || 'order_execution',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    };
}

// Parse REDIS_URL if provided (Railway/Render format)
function parseRedisConfig() {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
        // Parse redis://default:password@host:port
        try {
            const url = new URL(redisUrl);
            return {
                host: url.hostname,
                port: parseInt(url.port || '6379', 10),
                password: url.password || undefined,
                maxRetriesPerRequest: null
            };
        } catch (error) {
            console.error('Failed to parse REDIS_URL:', error);
        }
    }

    // Fallback to individual environment variables
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null
    };
}

export const config = {
    server: {
        port: parseInt(process.env.PORT || '3000', 10),
        host: process.env.HOST || '0.0.0.0',
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    redis: parseRedisConfig(),
    postgres: parsePostgresConfig(),
    queue: {
        maxConcurrentOrders: parseInt(process.env.MAX_CONCURRENT_ORDERS || '10', 10),
        ordersPerMinute: parseInt(process.env.ORDERS_PER_MINUTE || '100', 10),
        maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10)
    },
    mock: {
        executionDelayMs: parseInt(process.env.MOCK_EXECUTION_DELAY_MS || '2000', 10),
        quoteDelayMs: parseInt(process.env.MOCK_QUOTE_DELAY_MS || '200', 10)
    },
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        wsUrl: process.env.SOLANA_WS_URL || 'wss://api.devnet.solana.com'
    }
};

