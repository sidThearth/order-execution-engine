const http = require('http');
const WebSocket = require('ws');

// 1. Check Health
console.log('1️⃣  Checking Health...');
http.get('http://localhost:3001/health', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('✅ Health Status:', JSON.parse(data));
        submitOrder();
    });
});

function submitOrder() {
    console.log('\n2️⃣  Submitting Market Order...');
    const orderData = JSON.stringify({
        userId: "user-123",
        orderType: "MARKET",
        tokenIn: "SOL",
        tokenOut: "USDC",
        amountIn: 1,
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
            console.log('✅ Order Submitted:', response);
            if (response.orderId) {
                connectWebSocket(response.orderId);
            }
        });
    });

    req.write(orderData);
    req.end();
}

function connectWebSocket(orderId) {
    console.log(`\n3️⃣  Connecting to WebSocket for Order ${orderId}...`);
    const ws = new WebSocket(`ws://localhost:3001/api/orders/ws/${orderId}`);

    ws.on('open', () => {
        console.log('✅ WebSocket Connected!');
    });

    ws.on('message', (data) => {
        const update = JSON.parse(data);
        console.log(`\n🔄 Status Update: ${update.status.toUpperCase()}`);
        console.log(`   Message: ${update.message}`);

        if (update.data) {
            console.log('   Data:', update.data);
        }

        if (update.status === 'confirmed' || update.status === 'failed') {
            console.log('\n✨ Order Execution Complete!');
            ws.close();
            process.exit(0);
        }
    });

    ws.on('error', (err) => {
        console.error('❌ WebSocket Error:', err.message);
    });
}
