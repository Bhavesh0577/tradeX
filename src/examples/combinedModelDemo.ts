/**
 * Combined Trading Model Demo
 * 
 * This demo shows how to use the combined trading model with
 * sentiment analysis and backtesting capabilities.
 */

import { TradingEnsembleModel } from '../lib/ml/tradingModel';
import { SentimentAnalyzer, NewsItem, SocialMediaPost } from '../lib/ml/sentimentAnalysis';
import { CombinedTradingModel } from '../lib/ml/combinedTradingModel';
import { BacktestConfig } from '../lib/trading/backtesting';

// Sample historical data (in a real application, this would be loaded from a database or API)
const generateSampleMarketData = (symbol: string, days: number) => {
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let price = symbol === 'AAPL' ? 150 :
        symbol === 'MSFT' ? 300 :
            symbol === 'GOOGL' ? 130 :
                symbol === 'AMZN' ? 140 : 100;

    for (let i = 0; i < days * 24; i++) { // Hourly data
        const timestamp = new Date(startDate);
        timestamp.setHours(timestamp.getHours() + i);

        // Generate some random price movement
        const priceChange = (Math.random() - 0.48) * 2; // Slight upward bias
        price = price * (1 + priceChange / 100);

        // Calculate high, low, open
        const high = price * (1 + Math.random() * 0.01);
        const low = price * (1 - Math.random() * 0.01);
        const open = low + Math.random() * (high - low);

        // Calculate some technical indicators
        const rsi = 30 + Math.random() * 40; // Random RSI between 30 and 70
        const macd = -2 + Math.random() * 4; // Random MACD between -2 and 2
        const ema50 = price * (1 - 0.02 + Math.random() * 0.04);
        const ema200 = price * (1 - 0.05 + Math.random() * 0.1);

        // Create data point
        data.push({
            symbol,
            timestamp: timestamp.getTime(),
            open,
            high,
            low,
            close: price,
            volume: 100000 + Math.random() * 900000,
            rsi,
            macd,
            macdSignal: macd * (0.8 + Math.random() * 0.4),
            macdHistogram: macd * (0.5 + Math.random() * 1),
            ema20: price * (1 - 0.01 + Math.random() * 0.02),
            ema50,
            ema200,
            bollingerUpper: price * 1.05,
            bollingerMiddle: price,
            bollingerLower: price * 0.95,
            atr: price * 0.01,
            obv: 100000 * (1 + i / 100)
        });
    }

    return data;
};

// Generate sample news data
const generateSampleNewsData = (symbols: string[], days: number): NewsItem[] => {
    const news: NewsItem[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // News sources
    const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Financial Times', 'MarketWatch', 'Wall Street Journal'];

    // News categories
    const categories = ['Earnings', 'Company News', 'Industry News', 'Market Analysis', 'Economy'];

    // Generate some news for each symbol
    for (const symbol of symbols) {
        const newsCount = 5 + Math.floor(Math.random() * 20); // 5-25 news items per symbol

        for (let i = 0; i < newsCount; i++) {
            const timestamp = new Date(startDate);
            timestamp.setHours(timestamp.getHours() + Math.random() * days * 24);

            // Determine if news is positive, negative, or neutral
            const sentiment = Math.random();
            let title, content;

            if (sentiment > 0.7) { // Positive news
                title = `${symbol} Reports Strong Quarterly Results, Exceeding Expectations`;
                content = `${symbol} has announced quarterly earnings that exceeded analyst expectations, with revenue growing by 15% year-over-year. The company also raised its forward guidance for the upcoming fiscal year.`;
            } else if (sentiment < 0.3) { // Negative news
                title = `${symbol} Faces Challenges Amid Industry Headwinds`;
                content = `${symbol} reported disappointing quarterly results as the company continues to face challenges from increased competition and supply chain disruptions. The stock is down in pre-market trading.`;
            } else { // Neutral news
                title = `${symbol} Announces New Strategic Initiative`;
                content = `${symbol} has unveiled a new strategic initiative focused on expanding its market presence in emerging markets. The company expects this move to generate moderate growth in the medium term.`;
            }

            // Create news item
            news.push({
                title,
                content,
                source: sources[Math.floor(Math.random() * sources.length)],
                url: `https://example.com/news/${symbol.toLowerCase()}/${i}`,
                timestamp: timestamp.getTime(),
                symbols: [symbol],
                categories: [categories[Math.floor(Math.random() * categories.length)]]
            });
        }
    }

    return news;
};

// Generate sample social media data
const generateSampleSocialData = (symbols: string[], days: number): SocialMediaPost[] => {
    const posts: SocialMediaPost[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Platforms
    const platforms = ['twitter', 'reddit', 'stocktwits', 'other'] as const;

    // Generate some posts for each symbol
    for (const symbol of symbols) {
        const postCount = 20 + Math.floor(Math.random() * 80); // 20-100 posts per symbol

        for (let i = 0; i < postCount; i++) {
            const timestamp = new Date(startDate);
            timestamp.setHours(timestamp.getHours() + Math.random() * days * 24);

            // Determine if post is positive, negative, or neutral
            const sentiment = Math.random();
            let content;

            if (sentiment > 0.7) { // Positive post
                content = `$${symbol} looking strong today! Great buying opportunity for long-term investors. #bullish`;
            } else if (sentiment < 0.3) { // Negative post
                content = `$${symbol} is overvalued at current levels. The recent earnings don't justify this price. #bearish`;
            } else { // Neutral post
                content = `Watching $${symbol} closely today. Waiting for a clear signal before making a move.`;
            }

            // Create social media post
            posts.push({
                content,
                platform: platforms[Math.floor(Math.random() * platforms.length)],
                author: `user${Math.floor(Math.random() * 10000)}`,
                timestamp: timestamp.getTime(),
                likes: Math.floor(Math.random() * 50),
                comments: Math.floor(Math.random() * 10),
                shares: Math.floor(Math.random() * 5),
                symbols: [symbol]
            });
        }
    }

    return posts;
};

// Main demo function
async function runDemo() {
    console.log("Starting Combined Trading Model Demo");

    // Define the symbols to use in the demo
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN'];

    // Generate sample data
    const historicalData: { [symbol: string]: any[] } = {};

    console.log("Generating sample historical data...");
    for (const symbol of symbols) {
        historicalData[symbol] = generateSampleMarketData(symbol, 30); // 30 days of data
    }

    console.log("Generating sample news and social media data...");
    const newsData = generateSampleNewsData(symbols, 30);
    const socialData = generateSampleSocialData(symbols, 30);

    // Initialize technical model
    console.log("Initializing technical trading model...");
    const technicalModel = new TradingEnsembleModel();
    await technicalModel.initialize();

    // Add historical data to technical model
    for (const symbol of symbols) {
        technicalModel.addMarketData(symbol, historicalData[symbol]);
    }

    // Initialize sentiment analyzer
    console.log("Initializing sentiment analyzer...");
    const sentimentAnalyzer = new SentimentAnalyzer();

    // Add news and social data to sentiment analyzer
    sentimentAnalyzer.addNewsData(newsData);
    sentimentAnalyzer.addSocialData(socialData);

    // Initialize combined model
    console.log("Initializing combined trading model...");
    const combinedModel = new CombinedTradingModel(
        technicalModel,
        sentimentAnalyzer,
        {
            technicalWeight: 0.7,
            sentimentWeight: 0.3,
            enableContrarian: true,
            contraryThreshold: 0.8,
            primaryTimeframe: '1h'
        }
    );

    // Get live trading signals
    console.log("\nGenerating trading signals for current market data:");
    for (const symbol of symbols) {
        const latestData = historicalData[symbol][historicalData[symbol].length - 1];
        const signal = await combinedModel.generateSignal(symbol, latestData);

        console.log(`\n${symbol} Signal:`);
        if (signal) {
            console.log(`Action: ${signal.action}`);
            console.log(`Confidence: ${signal.confidence.toFixed(2)}`);
            console.log(`Price: $${signal.price.toFixed(2)}`);
            console.log(`Timestamp: ${signal.timestamp}`);
            console.log(`Reasoning:`);
            signal.reasoning.forEach((reason, i) => console.log(`  ${i + 1}. ${reason}`));
            console.log(`Technical Indicators:`);
            for (const [key, value] of Object.entries(signal.indicators)) {
                console.log(`  ${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`);
            }
        } else {
            console.log("No signal generated");
        }
    }

    // Setup backtesting
    console.log("\nSetting up backtesting...");
    const backtestConfig: Partial<BacktestConfig> = {
        initialCapital: 100000,
        startDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        endDate: new Date(), // Today
        tradingFrequency: 60, // 1 hour
        commission: 0.1, // 0.1%
        slippageModel: 'fixed',
        slippageAmount: 0.05, // 0.05%
        stopLossPercent: 2.0,
        takeProfitPercent: 4.0,
        riskPerTradePercent: 1.0,
        symbols: symbols
    };

    combinedModel.setupBacktesting(backtestConfig);

    // Run backtest
    console.log("Running backtest...");
    const backtestResult = await combinedModel.runBacktest(historicalData);

    if (backtestResult) {
        console.log("\nBacktest Results:");
        console.log(`Initial Capital: $${backtestResult.initialCapital.toFixed(2)}`);
        console.log(`Final Capital: $${backtestResult.finalCapital.toFixed(2)}`);
        console.log(`Total Return: $${backtestResult.totalReturn.toFixed(2)} (${backtestResult.totalReturnPercent.toFixed(2)}%)`);
        console.log(`Annualized Return: ${backtestResult.annualizedReturn.toFixed(2)}%`);
        console.log(`Win Rate: ${backtestResult.winRate.toFixed(2)}%`);
        console.log(`Total Trades: ${backtestResult.totalTrades}`);
        console.log(`Winning Trades: ${backtestResult.winningTrades}`);
        console.log(`Losing Trades: ${backtestResult.losingTrades}`);
        console.log(`Profit Factor: ${backtestResult.profitFactor.toFixed(2)}`);
        console.log(`Sharpe Ratio: ${backtestResult.sharpeRatio.toFixed(2)}`);
        console.log(`Max Drawdown: $${backtestResult.maxDrawdown.toFixed(2)} (${backtestResult.maxDrawdownPercent.toFixed(2)}%)`);
        console.log(`Average Holding Period: ${backtestResult.averageHoldingPeriodHours.toFixed(2)} hours`);

        console.log("\nSymbol Performance:");
        for (const [symbol, performance] of Object.entries(backtestResult.symbolPerformance)) {
            console.log(`${symbol}: ${performance.trades} trades, ${performance.winRate.toFixed(2)}% win rate, $${performance.pnl.toFixed(2)} P&L`);
        }

        console.log("\nMonthly Returns:");
        backtestResult.monthlyReturns.forEach(month => {
            console.log(`${month.month}: ${month.return.toFixed(2)}%`);
        });

        console.log("\nSample Trades:");
        backtestResult.trades.slice(0, 5).forEach((trade, i) => {
            console.log(`\nTrade ${i + 1}:`);
            console.log(`Symbol: ${trade.symbol}`);
            console.log(`Direction: ${trade.direction}`);
            console.log(`Entry: ${trade.entryTime.toISOString()} @ $${trade.entryPrice.toFixed(2)}`);
            console.log(`Exit: ${trade.exitTime?.toISOString()} @ $${trade.exitPrice?.toFixed(2)}`);
            console.log(`P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
            console.log(`Holding Period: ${trade.holdingPeriodHours.toFixed(2)} hours`);
            console.log(`Exit Reason: ${trade.exitReason}`);
        });
    } else {
        console.log("No backtest results available");
    }

    console.log("\nDemo completed!");
}

// Run the demo
runDemo().catch(error => {
    console.error("Error running demo:", error);
}); 