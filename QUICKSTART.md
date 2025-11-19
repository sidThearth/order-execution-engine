# Quick Start Guide - Order Execution Engine

## ✅ Docker Containers Running

Both Redis and PostgreSQL are running! You can verify with:
```bash
docker ps
```

## 🚀 Run the Application

The nodemon dev server should auto-restart now that the containers are up. If it hasn't, just type in the terminal:
```bash
rs
```

Or restart manually:
```bash
npm run dev
```

## 🧪 Test It Out

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Submit a Test Order
```bash
curl -X POST http://localhost:3000/api/orders/execute -H "Content-Type: application/json" -d "{\"userId\":\"user-123\",\"orderType\":\"MARKET\",\"tokenIn\":\"SOL\",\"tokenOut\":\"USDC\",\"amountIn\":100,\"slippage\":1}"
```

Copy the `orderId` from the response.

### 3. Watch Live Updates (WebSocket)

Install wscat if needed:
```bash
npm install -g wscat
```

Connect to WebSocket (replace `<orderId>` with actual ID):
```bash
wscat -c ws://localhost:3000/api/orders/ws/<orderId>
```

You'll see status updates in real-time! 🎉

## 🛑 Stop Containers (when done)

```bash
docker stop redis-order-engine postgres-order-engine
```

## 🗑️ Remove Containers (to start fresh)

```bash
docker rm redis-order-engine postgres-order-engine
```

## 📊 Check Metrics

```bash
curl http://localhost:3000/api/orders/metrics
```
