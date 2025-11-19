import { MockDexRouter } from '../src/dex/MockDexRouter';
import { DexProvider } from '../src/types';

describe('MockDexRouter', () => {
    let dexRouter: MockDexRouter;

    beforeEach(() => {
        dexRouter = new MockDexRouter();
    });

    test('should fetch Raydium quote with valid parameters', async () => {
        const quote = await dexRouter.getRaydiumQuote('SOL', 'USDC', 100);

        expect(quote).toBeDefined();
        expect(quote.dex).toBe(DexProvider.RAYDIUM);
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.fee).toBe(0.003);
        expect(quote.effectivePrice).toBeLessThan(quote.price);
        expect(quote.estimatedOutput).toBeGreaterThan(0);
    });

    test('should fetch Meteora quote with valid parameters', async () => {
        const quote = await dexRouter.getMeteorQuote('SOL', 'USDC', 100);

        expect(quote).toBeDefined();
        expect(quote.dex).toBe(DexProvider.METEORA);
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.fee).toBe(0.002);
        expect(quote.effectivePrice).toBeLessThan(quote.price);
        expect(quote.estimatedOutput).toBeGreaterThan(0);
    });

    test('should compare quotes and select better one', async () => {
        const raydiumQuote = await dexRouter.getRaydiumQuote('SOL', 'USDC', 100);
        const meteoraQuote = await dexRouter.getMeteorQuote('SOL', 'USDC', 100);

        const bestQuote = dexRouter.compareQuotes(raydiumQuote, meteoraQuote);

        expect(bestQuote).toBeDefined();
        expect([DexProvider.RAYDIUM, DexProvider.METEORA]).toContain(bestQuote.dex);
        expect(bestQuote.estimatedOutput).toBeGreaterThanOrEqual(
            Math.min(raydiumQuote.estimatedOutput, meteoraQuote.estimatedOutput)
        );
    });

    test('should execute swap and return transaction hash', async () => {
        const result = await dexRouter.executeSwap(
            DexProvider.RAYDIUM,
            'SOL',
            'USDC',
            100,
            1
        );

        expect(result).toBeDefined();
        expect(result.txHash).toBeDefined();
        expect(result.txHash.length).toBeGreaterThan(50);
        expect(result.executedPrice).toBeGreaterThan(0);
        expect(result.amountOut).toBeGreaterThan(0);
    });

    test('should get best quote from both DEXs', async () => {
        const { bestQuote, raydiumQuote, meteoraQuote } = await dexRouter.getBestQuote(
            'SOL',
            'USDC',
            100
        );

        expect(bestQuote).toBeDefined();
        expect(raydiumQuote).toBeDefined();
        expect(meteoraQuote).toBeDefined();
        expect([raydiumQuote, meteoraQuote]).toContainEqual(bestQuote);
    });

    test('should handle execution failures occasionally', async () => {
        // Run multiple executions to potentially trigger the 5% failure rate
        const executions = Array(20).fill(null).map(() =>
            dexRouter.executeSwap(DexProvider.RAYDIUM, 'SOL', 'USDC', 100, 1)
                .catch(err => err)
        );

        const results = await Promise.all(executions);

        // At least some should succeed
        const successes = results.filter(r => r && r.txHash);
        expect(successes.length).toBeGreaterThan(0);
    });
});
