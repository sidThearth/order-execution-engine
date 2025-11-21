const http = require('http');
const WebSocket = require('ws');

const TOTAL_ORDERS = 5;
const API_URL = 'http://localhost:3001'; // Make sure this matches your PORT
const WS_URL = 'ws://localhost:3001';

console.log(`
🎥 STARTING DEMO SIMULATION
===========================
🚀 Submitting ${TOTAL_ORDERS} concurrent orders...
`);

// Function to submit an order
function submitOrder(index) {
    const orderData = JSON.stringify({
        userId: `demo-user-${index}`,
        orderType: "MARKET",
        tokenIn: "SOL",
        tokenOut: "USDC",
        amountIn: 1 + (index * 0.5), // Different amounts
        slippage: 0.5
    });

    const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/orders/execute',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': orderData.length
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            const response = JSON.parse(data);
            if (response.orderId) {
                console.log(`[Order ${index + 1}] ✅ Submitted! ID: ${response.orderId.slice(0, 8)}...`);
                connectWebSocket(response.orderId, index + 1);
            } else {
                console.error(`[Order ${index + 1}] ❌ Failed:`, response);
            }
        });
    });

    req.write(orderData);
    req.end();
}

// Function to connect WebSocket
function connectWebSocket(orderId, index) {
    const ws = new WebSocket(`${WS_URL}/api/orders/ws/${orderId}`);

    ws.on('open', () => {
        // console.log(`[Order ${index}] 📡 WebSocket Connected`);
    });

    ws.on('message', (data) => {
        const update = JSON.parse(data);
        const status = update.status.toUpperCase();

        let icon = '🔄';
        if (status === 'PENDING') icon = '⏳';
        if (status === 'ROUTING') icon = '🛣️';
        if (status === 'BUILDING') icon = '🔨';
        if (status === 'SUBMITTED') icon = '🚀';
        if (status === 'CONFIRMED') icon = '✅';
        if (status === 'FAILED') icon = '❌';

        console.log(`[Order ${index}] ${icon} Status: ${status.padEnd(10)} | ${update.message}`);

        if (update.data && update.data.dexUsed) {
            console.log(`[Order ${index}] 💰 Routing: Used ${update.data.dexUsed} @ ${update.data.executedPrice}`);
        }

        if (status === 'CONFIRMED' || status === 'FAILED') {
            ws.close();
        }
    });
}

// Submit all orders simultaneously
for (let i = 0; i < TOTAL_ORDERS; i++) {
    submitOrder(i);
}
