// Mock data generator for trading bot demo
import { BotConfig, TradeResult, PositionInfo } from '@/lib/trading/tradingBot';

// Define the PerformanceChartDataPoint interface
export interface PerformanceChartDataPoint {
    date: string;
    value: number;
    intraday: Array<{
        timestamp: string;
        value: number;
    }>;
}

// Sample stock data with realistic prices
const SAMPLE_STOCKS = [
    { symbol: "RELIANCE.NS", name: "Reliance Industries", basePrice: 2750, volatility: 0.02 },
    { symbol: "TATASTEEL.NS", name: "Tata Steel Ltd", basePrice: 142, volatility: 0.03 },
    { symbol: "HDFCBANK.NS", name: "HDFC Bank", basePrice: 1680, volatility: 0.015 },
    { symbol: "INFY.NS", name: "Infosys Ltd", basePrice: 1450, volatility: 0.025 },
    { symbol: "TCS.NS", name: "Tata Consultancy Services", basePrice: 3490, volatility: 0.018 },
    { symbol: "SBIN.NS", name: "State Bank of India", basePrice: 740, volatility: 0.028 },
    { symbol: "WIPRO.NS", name: "Wipro Ltd", basePrice: 456, volatility: 0.022 },
    { symbol: "LT.NS", name: "Larsen & Toubro", basePrice: 3120, volatility: 0.019 },
    { symbol: "MARUTI.NS", name: "Maruti Suzuki India", basePrice: 10450, volatility: 0.024 },
    { symbol: "ICICIBANK.NS", name: "ICICI Bank", basePrice: 1020, volatility: 0.017 }
];

// Generate a random price with realistic movement
const getRandomPrice = (basePrice: number, volatility: number) => {
    const change = basePrice * volatility * (Math.random() * 2 - 1);
    return Math.max(basePrice + change, basePrice * 0.5); // Prevent prices from going too low
};

// Generate timestamp within the last few days
const getRandomTimestamp = (daysAgo = 30) => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
    return pastDate.getTime();
};

// Generate a realistic trade history
export function generateMockTradeHistory(count = 25): TradeResult[] {
    const trades: TradeResult[] = [];

    // Create progressively older trades
    for (let i = 0; i < count; i++) {
        const stock = SAMPLE_STOCKS[Math.floor(Math.random() * SAMPLE_STOCKS.length)];
        const tradeType = Math.random() > 0.5 ? 'BUY' : 'SELL';
        const price = getRandomPrice(stock.basePrice, stock.volatility);
        const quantity = Math.floor(Math.random() * 20) + 1;
        const success = Math.random() > 0.1; // 90% success rate

        // Create trade with realistic profit/loss
        const profitLoss = tradeType === 'SELL'
            ? (price - stock.basePrice * (1 - Math.random() * 0.05)) * quantity
            : 0;

        trades.push({
            symbol: stock.symbol,
            tradeType,
            price,
            quantity,
            timestamp: getRandomTimestamp(i), // Spread trades over time
            success,
            profitLoss,
            reason: `AI detected ${tradeType === 'BUY' ? 'bullish' : 'bearish'} pattern with ${Math.floor(Math.random() * 30 + 70)}% confidence`,
            orderId: `ORD${Math.floor(Math.random() * 10000000)}`
        });
    }

    // Sort by timestamp (newest first)
    return trades.sort((a, b) => b.timestamp - a.timestamp);
}

// Generate realistic active positions
export function generateMockPositions(count = 5): PositionInfo[] {
    const positions: PositionInfo[] = [];

    // Create sample positions
    for (let i = 0; i < count; i++) {
        const stock = SAMPLE_STOCKS[Math.floor(Math.random() * SAMPLE_STOCKS.length)];
        const entryPrice = getRandomPrice(stock.basePrice, stock.volatility * 0.5);
        const currentPrice = getRandomPrice(entryPrice, stock.volatility);
        const quantity = Math.floor(Math.random() * 15) + 5;

        // Calculate P&L
        const unrealizedPnL = (currentPrice - entryPrice) * quantity;
        const unrealizedPnLPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

        positions.push({
            symbol: stock.symbol,
            quantity,
            entryPrice,
            currentPrice,
            stopLoss: entryPrice * 0.95, // 5% stop loss
            takeProfit: entryPrice * 1.10, // 10% take profit
            unrealizedPnL,
            unrealizedPnLPercent,
            entryTime: getRandomTimestamp(5) // Opened within last 5 days
        });
    }

    return positions;
}

// Generate bot statistics
export function generateMockBotStatistics(config: BotConfig) {
    // Calculate winning trades based on trade history
    const trades = generateMockTradeHistory(50);
    const winningTrades = trades.filter(t => (t.profitLoss ?? 0) > 0).length;
    const losingTrades = trades.filter(t => (t.profitLoss ?? 0) < 0).length;
    const totalPL = trades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);

    // Generate daily trade pattern (more trades earlier in the day)
    const today = new Date();
    const todayTrades = Math.min(Math.floor(Math.random() * (config.maxTradesPerDay || 5)), (config.maxTradesPerDay || 5) - 1);

    // Generate realistic portfolio metrics
    const initialCapital = 100000;
    const portfolioValue = initialCapital + totalPL;
    const totalReturnPercent = (totalPL / initialCapital) * 100;

    // Active positions value
    const positions = generateMockPositions(Math.floor(Math.random() * 5) + 1);
    const positionsValue = positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0);

    return {
        totalTrades: trades.length,
        winningTrades: winningTrades,
        losingTrades: losingTrades,
        winRate: winningTrades / (winningTrades + losingTrades) * 100,
        portfolioValue: portfolioValue,
        availableCapital: portfolioValue - positionsValue,
        totalReturn: totalPL,
        totalReturnPercent,
        dailyTradesRemaining: (config.maxTradesPerDay || 5) - todayTrades,
        avgHoldingPeriod: Math.floor(Math.random() * 24) + 2, // hours
        mostProfitableTrade: Math.max(...trades.map(t => t.profitLoss || 0)).toFixed(2),
        biggestLoss: Math.min(...trades.map(t => t.profitLoss || 0)).toFixed(2),
        lastUpdated: new Date()
    };
}

// Generate AI signals with technical indicators
export function generateMockSignals(symbols: string[]) {
    const signals: Record<string, any> = {};

    for (const symbol of symbols) {
        const stockInfo = SAMPLE_STOCKS.find(s => s.symbol === symbol) ||
            { symbol, basePrice: 1000, volatility: 0.02, name: symbol.replace('.NS', '') };

        const price = getRandomPrice(stockInfo.basePrice, stockInfo.volatility);

        // Randomly assign action with higher probability for HOLD
        const actionRandom = Math.random();
        let action = 'HOLD';
        let confidence = 0.5 + Math.random() * 0.3; // 50-80% confidence for HOLD

        if (actionRandom > 0.7) {
            action = 'BUY';
            confidence = 0.7 + Math.random() * 0.25; // 70-95% confidence for BUY
        } else if (actionRandom < 0.3) {
            action = 'SELL';
            confidence = 0.7 + Math.random() * 0.25; // 70-95% confidence for SELL
        }

        // Generate realistic technical indicators
        const rsi = action === 'BUY' ? 25 + Math.random() * 15 :
            action === 'SELL' ? 70 + Math.random() * 15 :
                40 + Math.random() * 20;

        const macd = action === 'BUY' ? 0.1 + Math.random() * 2 :
            action === 'SELL' ? -0.1 - Math.random() * 2 :
                -0.5 + Math.random();

        const ema50 = price * (0.9 + Math.random() * 0.2);
        const ema200 = price * (0.85 + Math.random() * 0.3);
        const priceChange24h = action === 'BUY' ? 0.5 + Math.random() * 3 :
            action === 'SELL' ? -0.5 - Math.random() * 3 :
                -1 + Math.random() * 2;

        // Generate reasoning based on indicators
        const reasons: string[] = [];
        if (rsi < 30) reasons.push("RSI indicates oversold conditions");
        if (rsi > 70) reasons.push("RSI indicates overbought conditions");
        if (macd > 0 && action === 'BUY') reasons.push("MACD shows bullish momentum");
        if (macd < 0 && action === 'SELL') reasons.push("MACD shows bearish momentum");
        if (ema50 > ema200 && action === 'BUY') reasons.push("Price above 200 EMA signals uptrend");
        if (ema50 < ema200 && action === 'SELL') reasons.push("Price below 200 EMA signals downtrend");
        if (priceChange24h > 2) reasons.push("Strong upward momentum in the last 24h");
        if (priceChange24h < -2) reasons.push("Strong downward momentum in the last 24h");

        // If not enough reasons, add generic ones
        if (reasons.length < 2) {
            if (action === 'BUY') {
                reasons.push("AI pattern recognition detected potential upward movement");
                reasons.push("Volume analysis suggests accumulation phase");
            } else if (action === 'SELL') {
                reasons.push("AI pattern recognition detected potential downward movement");
                reasons.push("Volume analysis suggests distribution phase");
            } else {
                reasons.push("Technical indicators show mixed signals");
                reasons.push("Current price movement is within expected range");
            }
        }

        signals[symbol] = {
            symbol,
            action,
            price,
            confidence,
            timestamp: new Date().toISOString(),
            indicators: {
                rsi,
                macd,
                ema50,
                ema200,
                priceChange24h
            },
            reasoning: reasons
        };
    }

    return { signals };
}

// Generate complete bot demo data
export function generateCompleteMockData(config: BotConfig, symbols: string[]) {
    return {
        isRunning: true,
        config,
        statistics: generateMockBotStatistics(config),
        activePositions: generateMockPositions(Math.min(symbols.length, 3)),
        tradeHistory: generateMockTradeHistory(),
        signals: generateMockSignals(symbols)
    };
}

// Mock API response for trading bot status
export async function mockTradingBotResponse(delayMs = 500) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, delayMs));

    const config: BotConfig = {
        enabled: true,
        symbols: SAMPLE_STOCKS.slice(0, 5).map(s => s.symbol),
        tradingFrequency: 15,
        maxTradesPerDay: 10,
        investmentPerTrade: 5000,
        minConfidence: 0.75,
        stopLossPercent: 2.5,
        takeProfitPercent: 5.0,
        brokerId: 'ZERODHA',
        riskRewardRatio: 2.0,
        useTrailingStop: true,
        trailingStopPercent: 1.5,
        maxDrawdownPercent: 5.0,
        notificationsEnabled: true
    };

    return generateCompleteMockData(config, config.symbols);
}

// Map sample stocks to watchlist format
export function getSampleWatchlist() {
    return SAMPLE_STOCKS.map(stock => ({
        symbol: stock.symbol,
        name: stock.name
    }));
}

// Generate performance chart data for the dashboard
export function generatePerformanceChartData(days = 30) {
    const data: PerformanceChartDataPoint[] = [];
    let portfolioValue = 100000; // Start with 100k
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Generate a semi-realistic growth pattern with some randomness
    for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        // Create a slightly upward-biased random daily change (-2% to +3%)
        const dailyChangePercent = (Math.random() * 5 - 2) / 100;

        // Add some realistic market patterns
        let trendMultiplier = 1.0;

        // Simulate a market correction in the middle
        if (i > days / 2 - 3 && i < days / 2 + 3) {
            trendMultiplier = 0.7; // More likely to go down during correction
        }

        // Simulate recovery after correction
        if (i > days / 2 + 3 && i < days / 2 + 10) {
            trendMultiplier = 1.5; // More likely to go up during recovery
        }

        // Apply the change
        const adjustedChange = dailyChangePercent * trendMultiplier;
        portfolioValue = portfolioValue * (1 + adjustedChange);

        // Add some intraday data points (4 points per day)
        const dayData: Array<{ timestamp: string; value: number }> = [];
        let intraValue = portfolioValue * 0.995; // Start slightly lower

        for (let j = 0; j < 4; j++) {
            // Create intraday volatility
            const intraChange = (Math.random() * 1.2 - 0.5) / 100;
            intraValue = intraValue * (1 + intraChange);

            const hour = 9 + j * 2; // 9am, 11am, 1pm, 3pm
            const timestamp = new Date(date);
            timestamp.setHours(hour, 0, 0, 0);

            dayData.push({
                timestamp: timestamp.toISOString(),
                value: Math.round(intraValue * 100) / 100
            });
        }
        // Use the final value as the day's closing value
        data.push({
            date: date.toISOString().split('T')[0],
            value: Math.round(portfolioValue * 100) / 100,
            intraday: dayData
        } as PerformanceChartDataPoint);
    }

    return data;
}

// Default export for ease of use
export default {
    generateMockTradeHistory,
    generateMockPositions,
    generateMockBotStatistics,
    generateMockSignals,
    generateCompleteMockData,
    mockTradingBotResponse,
    getSampleWatchlist,
    generatePerformanceChartData,
    SAMPLE_STOCKS
}; 