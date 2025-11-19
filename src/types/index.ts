/**
 * Core type definitions for the Order Execution Engine
 */

export enum OrderType {
    MARKET = 'MARKET',
    LIMIT = 'LIMIT',
    SNIPER = 'SNIPER'
}

export enum OrderStatus {
    PENDING = 'pending',
    ROUTING = 'routing',
    BUILDING = 'building',
    SUBMITTED = 'submitted',
    CONFIRMED = 'confirmed',
    FAILED = 'failed'
}

export enum DexProvider {
    RAYDIUM = 'RAYDIUM',
    METEORA = 'METEORA'
}

export interface Order {
    orderId: string;
    userId: string;
    orderType: OrderType;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    slippage: number; // percentage (e.g., 1 = 1%)
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface DexQuote {
    dex: DexProvider;
    price: number; // tokenOut per tokenIn
    fee: number; // percentage
    liquidity: number;
    effectivePrice: number; // price after fees
    estimatedOutput: number; // expected tokenOut amount
}

export interface ExecutionResult {
    orderId: string;
    txHash: string;
    executedPrice: number;
    amountOut: number;
    dexUsed: DexProvider;
    executedAt: Date;
    gasFee?: number;
}

export interface OrderStatusUpdate {
    orderId: string;
    status: OrderStatus;
    timestamp: Date;
    message?: string;
    error?: string;
    data?: Partial<ExecutionResult>;
}

export interface CreateOrderRequest {
    userId: string;
    orderType: OrderType;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    slippage?: number; // default 1%
}

export interface CreateOrderResponse {
    orderId: string;
    status: OrderStatus;
    message: string;
}
