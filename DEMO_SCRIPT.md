# 🎥 Order Execution Engine - Demo Video Script

**Target Length:** 1-2 minutes
**Goal:** Demonstrate the core requirements: Market Order, DEX Routing, WebSocket Updates, and Queue System.

---

## 1. Setup (Before Recording)
1. Ensure Docker containers are running: `docker ps`
2. Ensure Server is running: `npm run dev`
3. Open these windows side-by-side:
   - **Terminal 1**: Server logs (showing "Routing..." messages)
   - **Terminal 2**: For running curl commands (or Postman)
   - **Terminal 3**: Running `wscat` for WebSocket updates
   - **Browser**: Open `http://localhost:3000/` to show the API is up

## 2. The Script

### **Intro (0:00 - 0:15)**
*   **Action**: Show the browser with the root API response.
*   **Say**: "Hi, this is my Order Execution Engine. It handles Market Orders with intelligent DEX routing between Raydium and Meteora, using a Redis-backed queue for concurrency."

### **WebSocket & Order Submission (0:15 - 0:45)**
*   **Action**: 
    1. In **Terminal 3**, run `wscat -c ws://localhost:3000/api/orders/ws/demo-order-1` (it will wait for connection).
    2. In **Terminal 2**, submit an order (copy-paste this):
       ```bash
       curl -X POST http://localhost:3000/api/orders/execute -H "Content-Type: application/json" -d "{\"userId\":\"demo-user\",\"orderType\":\"MARKET\",\"tokenIn\":\"SOL\",\"tokenOut\":\"USDC\",\"amountIn\":100,\"slippage\":1}"
       ```
    3. Quickly grab the `orderId` from the response and connect `wscat` if you didn't pre-connect, OR just explain the flow. 
    *Better approach for demo*: Run the `test-api.bat` script I created, or use the manual flow.

*   **Say**: "I'm submitting a Market Order for 100 SOL. You can see the real-time status updates via WebSocket here..."
*   **Action**: Point to the WebSocket terminal showing `pending` -> `routing` -> `submitted` -> `confirmed`.

### **DEX Routing Logic (0:45 - 1:00)**
*   **Action**: Switch to **Terminal 1** (Server Logs). Scroll to the routing log.
*   **Say**: "Here in the logs, you can see the engine comparing quotes. It fetched prices from both Raydium and Meteora, and selected [Meteora/Raydium] because it offered the best output."

### **Concurrency & Metrics (1:00 - 1:20)**
*   **Action**: Submit 3-4 orders rapidly in Terminal 2. Then check metrics:
    ```bash
    curl http://localhost:3000/api/orders/metrics
    ```
*   **Say**: "The system handles concurrent orders using BullMQ. Checking the metrics endpoint, we can see the active queue processing multiple orders simultaneously."

### **Outro (1:20 - 1:30)**
*   **Say**: "The project is fully containerized with Docker and includes comprehensive unit tests. Thanks for watching!"

---

## ⚡ Pro Tip for Smooth Recording
Run this PowerShell command to simulate traffic while you talk:
```powershell
1..5 | % { Invoke-RestMethod -Uri http://localhost:3000/api/orders/execute -Method POST -Body (@{userId="user-$_"; orderType="MARKET"; tokenIn="SOL"; tokenOut="USDC"; amountIn=100} | ConvertTo-Json) -ContentType "application/json" }
```
