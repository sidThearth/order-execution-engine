# WebSocket Testing Guide

Since Postman doesn't natively support WebSocket connections in the free tier, here are alternative methods to test WebSocket functionality:

## Option 1: wscat (Command Line)

1. Install wscat globally:
   ```bash
   npm install -g wscat
   ```

2. First, submit an order via POST:
   ```bash
   curl -X POST http://localhost:3000/api/orders/execute \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "user-123",
       "orderType": "MARKET",
       "tokenIn": "SOL",
       "tokenOut": "USDC",
       "amountIn": 100,
       "slippage": 1
     }'
   ```

3. Copy the `orderId` from response, then connect via WebSocket:
   ```bash
   wscat -c ws://localhost:3000/api/orders/ws/<orderId>
   ```

4. You'll see status updates in real-time:
   ```json
   {"orderId":"...","status":"pending","timestamp":"...","message":"Order received and queued"}
   {"orderId":"...","status":"routing","timestamp":"...","message":"Comparing DEX prices"}
   {"orderId":"...","status":"building","timestamp":"...","message":"Building transaction for METEORA"}
   {"orderId":"...","status":"submitted","timestamp":"...","message":"Transaction submitted to network"}
   {"orderId":"...","status":"confirmed","timestamp":"...","message":"Order executed successfully","data":{...}}
   ```

## Option 2: Browser Console

1. Open browser console (F12)

2. Submit order and capture orderId:
   ```javascript
   const response = await fetch('http://localhost:3000/api/orders/execute', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       userId: 'user-123',
       orderType: 'MARKET',
       tokenIn: 'SOL',
       tokenOut: 'USDC',
       amountIn: 100,
       slippage: 1
     })
   });
   const data = await response.json();
   console.log('Order ID:', data.orderId);
   ```

3. Connect WebSocket:
   ```javascript
   const ws = new WebSocket(`ws://localhost:3000/api/orders/ws/${data.orderId}`);
   
   ws.onmessage = (event) => {
     const update = JSON.parse(event.data);
     console.log(`[${update.status}]`, update.message, update.data || '');
   };
   
   ws.onclose = () => console.log('WebSocket closed');
   ws.onerror = (error) => console.error('WebSocket error:', error);
   ```

## Option 3: Postman Alternative - Insomnia

Insomnia has built-in WebSocket support:

1. Download Insomnia from https://insomnia.rest/
2. Create new WebSocket Request
3. URL: `ws://localhost:3000/api/orders/ws/<orderId>`
4. Click Connect to see live updates

## Testing Multiple Concurrent Orders

```bash
# Submit 5 orders simultaneously
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/orders/execute \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"user-$i\",
      \"orderType\": \"MARKET\",
      \"tokenIn\": \"SOL\",
      \"tokenOut\": \"USDC\",
      \"amountIn\": $((RANDOM % 500 + 100)),
      \"slippage\": 1
    }" &
done
wait

# Check queue metrics
curl http://localhost:3000/api/orders/metrics
```
