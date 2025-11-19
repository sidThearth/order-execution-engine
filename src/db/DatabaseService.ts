import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import { Order, OrderStatus, ExecutionResult } from '../types';

/**
 * PostgreSQL database service for order persistence
 */
export class DatabaseService {
    private pool: Pool;

    constructor() {
        this.pool = new Pool(config.postgres);
    }

    /**
     * Initialize database schema
     */
    async initialize(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          order_id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          order_type VARCHAR(20) NOT NULL,
          token_in VARCHAR(255) NOT NULL,
          token_out VARCHAR(255) NOT NULL,
          amount_in DECIMAL(20, 8) NOT NULL,
          slippage DECIMAL(5, 2) NOT NULL,
          status VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

        CREATE TABLE IF NOT EXISTS order_executions (
          id SERIAL PRIMARY KEY,
          order_id VARCHAR(36) REFERENCES orders(order_id),
          tx_hash VARCHAR(255),
          executed_price DECIMAL(20, 8),
          amount_out DECIMAL(20, 8),
          dex_used VARCHAR(20),
          gas_fee DECIMAL(20, 8),
          failure_reason TEXT,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_executions_order_id ON order_executions(order_id);
      `);
            console.log('Database schema initialized successfully');
        } finally {
            client.release();
        }
    }

    /**
     * Save a new order
     */
    async saveOrder(order: Order): Promise<void> {
        await this.pool.query(
            `INSERT INTO orders (order_id, user_id, order_type, token_in, token_out, amount_in, slippage, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                order.orderId,
                order.userId,
                order.orderType,
                order.tokenIn,
                order.tokenOut,
                order.amountIn,
                order.slippage,
                order.status,
                order.createdAt,
                order.updatedAt
            ]
        );
    }

    /**
     * Update order status
     */
    async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
        await this.pool.query(
            `UPDATE orders SET status = $1, updated_at = $2 WHERE order_id = $3`,
            [status, new Date(), orderId]
        );
    }

    /**
     * Save execution result
     */
    async saveExecutionResult(result: ExecutionResult, failureReason?: string): Promise<void> {
        await this.pool.query(
            `INSERT INTO order_executions (order_id, tx_hash, executed_price, amount_out, dex_used, gas_fee, failure_reason, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                result.orderId,
                result.txHash || null,
                result.executedPrice || null,
                result.amountOut || null,
                result.dexUsed || null,
                result.gasFee || null,
                failureReason || null,
                result.executedAt
            ]
        );
    }

    /**
     * Get order by ID
     */
    async getOrder(orderId: string): Promise<Order | null> {
        const result = await this.pool.query(
            'SELECT * FROM orders WHERE order_id = $1',
            [orderId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            orderId: row.order_id,
            userId: row.user_id,
            orderType: row.order_type,
            tokenIn: row.token_in,
            tokenOut: row.token_out,
            amountIn: parseFloat(row.amount_in),
            slippage: parseFloat(row.slippage),
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Get order history for a user
     */
    async getOrderHistory(userId: string, limit: number = 50): Promise<Order[]> {
        const result = await this.pool.query(
            `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
            [userId, limit]
        );

        return result.rows.map(row => ({
            orderId: row.order_id,
            userId: row.user_id,
            orderType: row.order_type,
            tokenIn: row.token_in,
            tokenOut: row.token_out,
            amountIn: parseFloat(row.amount_in),
            slippage: parseFloat(row.slippage),
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    /**
     * Close database connection pool
     */
    async close(): Promise<void> {
        await this.pool.end();
    }
}
