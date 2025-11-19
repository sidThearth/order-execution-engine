-- Order Execution Engine Database Schema

-- Orders table: stores all submitted orders
CREATE TABLE IF NOT EXISTS orders (
  order_id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT', 'SNIPER')),
  token_in VARCHAR(255) NOT NULL,
  token_out VARCHAR(255) NOT NULL,
  amount_in DECIMAL(20, 8) NOT NULL CHECK (amount_in > 0),
  slippage DECIMAL(5, 2) NOT NULL CHECK (slippage >= 0 AND slippage <= 100),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'routing', 'building', 'submitted', 'confirmed', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Order executions table: stores execution results and details
CREATE TABLE IF NOT EXISTS order_executions (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(36) REFERENCES orders(order_id) ON DELETE CASCADE,
  tx_hash VARCHAR(255),
  executed_price DECIMAL(20, 8),
  amount_out DECIMAL(20, 8),
  dex_used VARCHAR(20) CHECK (dex_used IN ('RAYDIUM', 'METEORA')),
  gas_fee DECIMAL(20, 8),
  failure_reason TEXT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookup by order
CREATE INDEX IF NOT EXISTS idx_executions_order_id ON order_executions(order_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON order_executions(executed_at DESC);

-- View for complete order history with execution details
CREATE OR REPLACE VIEW order_history AS
SELECT 
  o.order_id,
  o.user_id,
  o.order_type,
  o.token_in,
  o.token_out,
  o.amount_in,
  o.slippage,
  o.status,
  o.created_at,
  o.updated_at,
  e.tx_hash,
  e.executed_price,
  e.amount_out,
  e.dex_used,
  e.gas_fee,
  e.failure_reason,
  e.executed_at
FROM orders o
LEFT JOIN order_executions e ON o.order_id = e.order_id
ORDER BY o.created_at DESC;
