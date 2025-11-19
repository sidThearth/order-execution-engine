import { WebSocketManager } from '../src/websocket/WebSocketManager';
import { OrderStatus } from '../src/types';
import { WebSocket } from 'ws';

// Mock WebSocket
class MockWebSocket {
    readyState = WebSocket.OPEN;
    public sentMessages: string[] = [];
    public eventHandlers: Map<string, Function[]> = new Map();

    send(data: string) {
        this.sentMessages.push(data);
    }

    on(event: string, handler: Function) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(handler);
    }

    close() {
        this.readyState = WebSocket.CLOSED;
        const handlers = this.eventHandlers.get('close') || [];
        handlers.forEach(h => h());
    }

    ping() { }
}

describe('WebSocketManager', () => {
    let wsManager: WebSocketManager;

    beforeEach(() => {
        wsManager = new WebSocketManager();
    });

    test('should register WebSocket connection', () => {
        const orderId = 'test-order-1';
        const mockWs = new MockWebSocket() as any;

        wsManager.registerConnection(orderId, mockWs);

        expect(wsManager.getActiveConnections()).toBe(1);
    });

    test('should send status update to connected client', () => {
        const orderId = 'test-order-2';
        const mockWs = new MockWebSocket() as any;

        wsManager.registerConnection(orderId, mockWs);

        const update = {
            orderId,
            status: OrderStatus.ROUTING,
            timestamp: new Date(),
            message: 'Comparing DEX prices'
        };

        wsManager.sendStatusUpdate(orderId, update);

        expect(mockWs.sentMessages.length).toBe(1);
        const sentData = JSON.parse(mockWs.sentMessages[0]);
        expect(sentData.orderId).toBe(orderId);
        expect(sentData.status).toBe(OrderStatus.ROUTING);
    });

    test('should remove connection on close', () => {
        const orderId = 'test-order-3';
        const mockWs = new MockWebSocket() as any;

        wsManager.registerConnection(orderId, mockWs);
        expect(wsManager.getActiveConnections()).toBe(1);

        wsManager.removeConnection(orderId);
        expect(wsManager.getActiveConnections()).toBe(0);
    });

    test('should handle multiple concurrent connections', () => {
        const orders = ['order1', 'order2', 'order3', 'order4', 'order5'];

        orders.forEach(orderId => {
            const mockWs = new MockWebSocket() as any;
            wsManager.registerConnection(orderId, mockWs);
        });

        expect(wsManager.getActiveConnections()).toBe(5);
    });

    test('should not fail when sending to non-existent connection', () => {
        const update = {
            orderId: 'non-existent',
            status: OrderStatus.PENDING,
            timestamp: new Date(),
            message: 'Test'
        };

        expect(() => wsManager.sendStatusUpdate('non-existent', update)).not.toThrow();
    });

    test('should auto-cleanup on WebSocket close event', () => {
        const orderId = 'test-order-4';
        const mockWs = new MockWebSocket() as any;

        wsManager.registerConnection(orderId, mockWs);
        expect(wsManager.getActiveConnections()).toBe(1);

        // Simulate client disconnect
        mockWs.close();

        expect(wsManager.getActiveConnections()).toBe(0);
    });
});
