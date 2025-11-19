import Redis from 'ioredis';
import { config } from '../config';

/**
 * Redis service for active order tracking and WebSocket connection mapping
 */
export class RedisService {
    private client: Redis;

    constructor() {
        this.client = new Redis(config.redis);
    }

    /**
     * Save active order with TTL (24 hours)
     */
    async setActiveOrder(orderId: string, orderData: any): Promise<void> {
        const ttl = 24 * 60 * 60; // 24 hours
        await this.client.setex(
            `order:${orderId}`,
            ttl,
            JSON.stringify(orderData)
        );
    }

    /**
     * Get active order data
     */
    async getActiveOrder(orderId: string): Promise<any | null> {
        const data = await this.client.get(`order:${orderId}`);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Delete active order
     */
    async deleteActiveOrder(orderId: string): Promise<void> {
        await this.client.del(`order:${orderId}`);
    }

    /**
     * Map WebSocket connection to order
     */
    async mapWebSocketConnection(orderId: string, connectionId: string): Promise<void> {
        const ttl = 24 * 60 * 60; // 24 hours
        await this.client.setex(
            `ws:${orderId}`,
            ttl,
            connectionId
        );
    }

    /**
     * Get WebSocket connection ID for order
     */
    async getWebSocketConnection(orderId: string): Promise<string | null> {
        return await this.client.get(`ws:${orderId}`);
    }

    /**
     * Remove WebSocket connection mapping
     */
    async removeWebSocketConnection(orderId: string): Promise<void> {
        await this.client.del(`ws:${orderId}`);
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        await this.client.quit();
    }
}
