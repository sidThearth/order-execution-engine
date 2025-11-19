@echo off
echo Testing Order Execution Engine...
echo.

echo 1. Checking health endpoint...
curl -s http://localhost:3000/health
echo.
echo.

echo 2. Submitting test order...
curl -s -X POST http://localhost:3000/api/orders/execute -H "Content-Type: application/json" -d "{\"userId\":\"test-user\",\"orderType\":\"MARKET\",\"tokenIn\":\"SOL\",\"tokenOut\":\"USDC\",\"amountIn\":100,\"slippage\":1}"
echo.
echo.

echo 3. Checking queue metrics...
curl -s http://localhost:3000/api/orders/metrics
echo.
echo.

echo Test complete! Copy the orderId from above to test WebSocket.
echo Then run: wscat -c ws://localhost:3000/api/orders/ws/YOUR_ORDER_ID
pause
