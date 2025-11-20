import { DexProvider, DexQuote } from '../types';
import { config } from '../config';

/**
 * Mock DEX Router simulating Raydium and Meteora price quotes and swap execution
 */
export class MockDexRouter {
    private basePrice: number = 1.0; // Base exchange rate

    /**
     * Simulate fetching a quote from Raydium
     */
    async getRaydiumQuote(
        tokenIn: string,
        tokenOut: string,
        amountIn: number
    ): Promise<DexQuote> {
        // Simulate network delay
        await this.sleep(config.mock.quoteDelayMs);

        // Generate price with variance (0.98 - 1.02x)
        const price = this.basePrice * (0.98 + Math.random() * 0.04);
        const fee = 0.003; // 0.3% fee
        const liquidity = 1000000 + Math.random() * 500000;

        const effectivePrice = price * (1 - fee);
        const estimatedOutput = amountIn * effectivePrice;

        return {
            dex: DexProvider.RAYDIUM,
            price,
            fee,
            liquidity,
            effectivePrice,
            estimatedOutput
        };
    }

    /**
     * Simulate fetching a quote from Meteora
     */
    async getMeteorQuote(
        tokenIn: string,
        tokenOut: string,
        amountIn: number
    ): Promise<DexQuote> {
        // Simulate network delay
        await this.sleep(config.mock.quoteDelayMs);

        // Generate price with variance (0.97 - 1.03x)
        // Meteora often has better pricing
        const price = this.basePrice * (0.97 + Math.random() * 0.06);
        const fee = 0.002; // 0.2% fee (lower than Raydium)
        const liquidity = 800000 + Math.random() * 600000;

        const effectivePrice = price * (1 - fee);
        const estimatedOutput = amountIn * effectivePrice;

        return {
            dex: DexProvider.METEORA,
            price,
            fee,
            liquidity,
            effectivePrice,
            estimatedOutput
        };
    }

    /**
     * Compare quotes and select the best execution venue
     */
    compareQuotes(raydiumQuote: DexQuote, meteoraQuote: DexQuote): DexQuote {
        // Select DEX with higher effective output
        return raydiumQuote.estimatedOutput > meteoraQuote.estimatedOutput
            ? raydiumQuote
            : meteoraQuote;
    }

    /**
     * Simulate swap execution on selected DEX
     */
    async executeSwap(
        dex: DexProvider,
        tokenIn: string,
        tokenOut: string,
        amountIn: number,
        slippage: number
    ): Promise<{ txHash: string; executedPrice: number; amountOut: number }> {
        // Simulate execution delay (2-3 seconds)
        const executionDelay = config.mock.executionDelayMs + Math.random() * 1000;
        await this.sleep(executionDelay);

        // Simulate 5% failure rate
        if (Math.random() < 0.05) {
            throw new Error(`Mock execution failed on ${dex}: Insufficient liquidity`);
        }

        // Calculate executed price with minor slippage
        const slippageEffect = 1 - (slippage / 100) * Math.random();
        const executedPrice = this.basePrice * slippageEffect;
        const amountOut = amountIn * executedPrice;

        // Generate mock transaction hash
        const txHash = this.generateMockTxHash();

        // Handle Wrapped SOL for native token swaps
        if (tokenIn === 'SOL' || tokenOut === 'SOL') {
            console.log(`[${dex}] Wrapping/Unwrapping SOL <-> WSOL for swap execution`);
            // Simulate extra time for wrapping/unwrapping
            await this.sleep(200);
        }

        return {
            txHash,
            executedPrice,
            amountOut
        };
    }

    /**
     * Get quotes from both DEXs and select best one
     */
    async getBestQuote(
        tokenIn: string,
        tokenOut: string,
        amountIn: number
    ): Promise<{ bestQuote: DexQuote; raydiumQuote: DexQuote; meteoraQuote: DexQuote }> {
        // Fetch quotes in parallel
        const [raydiumQuote, meteoraQuote] = await Promise.all([
            this.getRaydiumQuote(tokenIn, tokenOut, amountIn),
            this.getMeteorQuote(tokenIn, tokenOut, amountIn)
        ]);

        const bestQuote = this.compareQuotes(raydiumQuote, meteoraQuote);

        return {
            bestQuote,
            raydiumQuote,
            meteoraQuote
        };
    }

    /**
     * Generate a mock Solana transaction hash
     */
    private generateMockTxHash(): string {
        const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let hash = '';
        for (let i = 0; i < 88; i++) {
            hash += chars[Math.floor(Math.random() * chars.length)];
        }
        return hash;
    }

    /**
     * Utility sleep function
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
