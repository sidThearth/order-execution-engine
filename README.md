# Order Execution Engine

A robust order execution engine with DEX routing (Raydium/Meteora), WebSocket status updates, and concurrent order processing for Solana-based token swaps.

## 🎯 Project Overview

This engine processes **Market Orders** with intelligent routing across multiple DEXs to find the best execution price. Orders are processed through a queue system with real-time WebSocket updates tracking each step from submission to confirmation.

### Why Market Orders?

**Market Orders** were chosen as the initial implementation for the following reasons:

- **Immediate Execution**: Executes right away at current market price, demonstrating DEX routing without additional complexity
- **Architecture Focus**: Allows focus on queue management, WebSocket streaming, and system design
- **Best for Mock Implementation**: Simplifies testing while maintaining realistic behavior

### Extension to Other Order Types

The architecture is designed for easy extension:

- **Limit Orders**: Add a price monitoring service that continuously polls DEX quotes and triggers execution when the target price is reached. Reuses existing DEX router and execution pipeline.
- **Sniper Orders**: Implement a token launch listener (monitoring new pool creation events on-chain) that triggers execution immediately upon detection. Leverages the same queue and WebSocket infrastructure.

Both extensions would integrate seamlessly with the existing order processor, queue system, and WebSocket manager.

## 🏗️ Architecture

```
POST /api/orders/execute
         │
         ├─> Order Validation
         ├─> Generate Order ID
         ├─> Add to BullMQ Queue (Redis)
         └─> Return Order ID + WebSocket URL
                  │
                  ├─> WebSocket /api/orders/ws/:orderId
                  │   
    ┌─────────────┴─────────────┐
    │   Order Processor Worker   │
    │  (10 concurrent, 100/min)  │
    └─────────────┬─────────────┘
                  │
    ┌─────────────▼──────────────┐
    │  Status: PENDING            │──> WebSocket Update
    │  Save order to PostgreSQL   │
    └─────────────┬──────────────┘
                  │
    ┌─────────────▼──────────────┐
    │  Status: ROUTING            │──> WebSocket Update
    │  Fetch Raydium Quote        │
    │  Fetch Meteora Quote        │
    │  Compare & Select Best      │
    └─────────────┬──────────────┘
                  │
    ┌─────────────▼──────────────┐
    │  Status: BUILDING           │──> WebSocket Update
    │  Build transaction          │
    └─────────────┬──────────────┘
                  │
    ┌─────────────▼──────────────┐
    │  Status: SUBMITTED          │──> WebSocket Update
    │  Execute swap on best DEX   │
    └─────────────┬──────────────┘
                  │
    ┌─────────────▼──────────────┐
    │  Status: CONFIRMED          │──> WebSocket Update
    │  Save execution result      │
    │  Return txHash              │
    └────────────────────────────┘
```

## 🚀 Features

- ✅ **Mock DEX Router**: Simulates Raydium and Meteora with realistic delays and price variance
- ✅ **Intelligent Routing**: Compares quotes and selects best execution venue
- ✅ **Queue System**: BullMQ with 10 concurrent workers, 100 orders/minute rate limit
- ✅ **Exponential Backoff**: Up to 3 retry attempts with increasing delays
- ✅ **WebSocket Streaming**: Real-time order status updates (pending → confirmed/failed)
- ✅ **Persistent Storage**: PostgreSQL for order history, Redis for active orders
- ✅ **Comprehensive Testing**: 20+ unit and integration tests

## 📋 Tech Stack

- **Runtime**: Node.js + TypeScript
- **Web Framework**: Fastify (HTTP + WebSocket)
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL
- **Testing**: Jest
- **DEX Simulation**: Mock Raydium & Meteora implementations

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd order-execution-engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL**
   ```bash
   # Create database
   createdb order_execution
   
   # Or using psql
   psql -U postgres -c "CREATE DATABASE order_execution;"
   ```

4. **Start Redis**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Or using local Redis installation
   redis-server
   ```

5. **Configure environment**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env with your settings (if needed)
   # Defaults should work for local development
   ```

### Running the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Documentation

### Submit Order

**Endpoint**: `POST /api/orders/execute`

**Request Body**:
```json
{
  "userId": "user-123",
  "orderType": "MARKET",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 100,
  "slippage": 1
}
```

**Response**:
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order submitted successfully"
}
```

### WebSocket Status Updates

**Endpoint**: `ws://localhost:3000/api/orders/ws/:orderId`

Connect immediately after receiving `orderId` from the POST endpoint.

**Message Format**:
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "timestamp": "2025-11-19T20:15:30.000Z",
  "message": "Comparing DEX prices",
  "data": {
    "txHash": "...",
    "executedPrice": 1.02,
    "amountOut": 102.0,
    "dexUsed": "METEORA"
  }
}
```

**Status Flow**:
1. `pending` - Order received and queued
2. `routing` - Comparing DEX prices
3. `building` - Creating transaction
4. `submitted` - Transaction sent to network
5. `confirmed` - Transaction successful ✅
6. `failed` - If any step fails ❌

### Queue Metrics

**Endpoint**: `GET /api/orders/metrics`

**Response**:
```json
{
  "waiting": 5,
  "active": 8,
  "completed": 142,
  "failed": 3,
  "total": 13,
  "activeConnections": 8
}
```

## 🧪 Testing

Run all tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

Coverage report:
```bash
npm run test:coverage
```

**Test Coverage**:
- MockDexRouter: 6 tests
- OrderQueue: 4 tests  
- WebSocketManager: 6 tests
- Configuration: 5 tests
- **Total: 21 tests** (exceeds ≥10 requirement)

## 📦 Deployment

### Deploy to Render (Free Tier)

1. Create account at [render.com](https://render.com)

2. Create PostgreSQL database:
   - New → PostgreSQL
   - Name: `order-execution-db`
   - Copy connection string

3. Create Redis instance:
   - New → Redis
   - Name: `order-execution-redis`
   - Copy connection string

4. Create Web Service:
   - New → Web Service
   - Connect GitHub repository
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Add environment variables from `.env.example`

5. Update environment variables with database URLs from steps 2-3

**Live URL**: `https://order-execution-engine.onrender.com`

## 🎥 Demo Video

**YouTube**: [Order Execution Engine Demo](https://youtube.com/demo-link)

The demo shows:
- Submitting 3-5 concurrent orders
- WebSocket streaming all status updates
- Console logs showing DEX routing decisions
- Queue processing multiple orders simultaneously

## 📚 Postman Collection

Import the Postman collection from:
```
./postman/Order-Execution-Engine.postman_collection.json
```

The collection includes:
- POST order execution with WebSocket setup
- Example requests for SOL → USDC swaps
- WebSocket connection examples
- Metrics endpoint

## 🔧 Development Notes

### Mock Implementation Details

- **Raydium**: 0.3% fee, price variance ±2%
- **Meteora**: 0.2% fee, price variance ±3% (often better pricing)
- **Execution delay**: 2-3 seconds
- **Failure rate**: ~5% (for testing retry logic)

### Queue Configuration

- **Max concurrent**: 10 orders
- **Rate limit**: 100 orders/minute
- **Retry attempts**: 3 with exponential backoff (2s, 4s, 8s)

### Database Schema

Orders table stores all submitted orders with status tracking.
Executions table stores execution results, transaction hashes, and failure reasons.

See `src/db/DatabaseService.ts` for full schema definitions.

## 🤝 Contributing

This is a demo project. For production use:
1. Replace mock DEX router with real Raydium/Meteora SDKs
2. Add proper authentication and authorization
3. Implement rate limiting per user
4. Add monitoring and alerting
5. Set up proper error handling for blockchain interactions

## 📄 License

ISC

---

**Author**: Order Execution Engine Team  
**Project**: Backend Task 2 - Order Execution Engine  
**Version**: 1.0.0
