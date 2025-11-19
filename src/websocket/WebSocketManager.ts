import { FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { OrderStatusUpdate } from '../types';

/**
 * WebSocket connection manager for order status updates
 */
export class WebSocketManager {
    private connections: Map<string, WebSocket>;

    constructor() {
        this.connections = new Map();
    }

    /**
     * Register a WebSocket connection for an order
     */
    registerConnection(orderId: string, ws: WebSocket): void {
        this.connections.set(orderId, ws);

        // Set up heartbeat
        ws.on('pong', () => {
            (ws as any).isAlive = true;
        });

        // Clean up on close
        ws.on('close', () => {
            this.removeConnection(orderId);
        });

        console.log(`WebSocket connected for order: ${orderId}`);
    }

    /**
     * Send status update to connected client
     */
    sendStatusUpdate(orderId: string, update: OrderStatusUpdate): void {
        const ws = this.connections.get(orderId);

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(update));
            console.log(`Status update sent for order ${orderId}:`, update.status);
        } else {
            console.warn(`No active WebSocket for order: ${orderId}`);
        }
    }

    /**
     * Remove connection from tracking
     */
    removeConnection(orderId: string): void {
        const ws = this.connections.get(orderId);
        if (ws) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            this.connections.delete(orderId);
            console.log(`WebSocket disconnected for order: ${orderId}`);
        }
    }

    /**
     * Start heartbeat interval to keep connections alive
     */
    startHeartbeat(): void {
        const interval = setInterval(() => {
            this.connections.forEach((ws, orderId) => {
                if (!(ws as any).isAlive) {
                    console.log(`Terminating stale connection for order: ${orderId}`);
                    return this.removeConnection(orderId);
                }

                (ws as any).isAlive = false;
                ws.ping();
            });
        }, 30000); // 30 seconds

        // Clean up on process exit
        process.on('SIGTERM', () => clearInterval(interval));
    }

    /**
     * Get total active connections
     */
    getActiveConnections(): number {
        return this.connections.size;
    }
}
