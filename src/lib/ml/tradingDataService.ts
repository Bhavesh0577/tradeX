/**
 * Trading Data Service
 * 
 * This service fetches and processes market data for use with the ML trading model
 */

import tradingModel, { MarketData, ModelPrediction } from './tradingModel';
import yahooFinance from 'yahoo-finance2';
import {
    calculateRSI,
    calculateMACD,
    calculateEMA,
    calculateBollingerBands,
    calculateATR,
    calculateOBV,
    extractPrices,
    extractHighs,
    extractLows,
    extractVolumes
} from './technicalIndicators';

// Service to handle data fetching and processing for the ML model
export class TradingDataService {
    private isInitialized: boolean = false;
    private marketDataCache: { [symbol: string]: MarketData[] } = {};
    private dataUpdateInterval: NodeJS.Timeout | null = null;
    private lastUpdateTimestamp: number = 0;
    private historicalDataInitialized: { [symbol: string]: boolean } = {};

    /**
     * Initialize the trading data service
     */
    public async initialize(): Promise<boolean> {
        try {
            console.log("Initializing TradingDataService...");

            // Initialize the ML model
            await tradingModel.initialize();

            this.isInitialized = true;
            console.log("TradingDataService initialized successfully");
            return true;
        } catch (error) {
            console.error("Failed to initialize TradingDataService:", error);
            return false;
        }
    }

    /**
     * Start periodic data updates
     */
    public startDataUpdates(symbols: string[], intervalMinutes: number = 5): void {
        if (this.dataUpdateInterval) {
            clearInterval(this.dataUpdateInterval);
        }

        // Initial fetch
        this.fetchMarketData(symbols);

        // Set interval for updates
        const intervalMs = intervalMinutes * 60 * 1000;
        this.dataUpdateInterval = setInterval(() => {
            this.fetchMarketData(symbols);
        }, intervalMs);

        console.log(`Started market data updates for ${symbols.length} symbols every ${intervalMinutes} minutes`);
    }

    /**
     * Stop periodic data updates
     */
    public stopDataUpdates(): void {
        if (this.dataUpdateInterval) {
            clearInterval(this.dataUpdateInterval);
            this.dataUpdateInterval = null;
            console.log("Stopped market data updates");
        }
    }

    /**
     * Fetch market data for symbols
     */
    public async fetchMarketData(symbols: string[]): Promise<boolean> {
        try {
            const currentTime = Date.now();
            this.lastUpdateTimestamp = currentTime;

            // For each symbol, fetch market data
            const promises = symbols.map(symbol => this.fetchDataForSymbol(symbol));
            await Promise.allSettled(promises);

            return true;
        } catch (error) {
            console.error("Error fetching market data:", error);
            return false;
        }
    }

    /**
     * Generate trading signals for symbols
     */
    public async generateSignals(symbols: string[]): Promise<{ [symbol: string]: ModelPrediction | null }> {
        if (!this.isInitialized) {
            throw new Error("TradingDataService is not initialized");
        }

        // Make sure we have historical data for all symbols
        await Promise.all(symbols.map(symbol => this.ensureHistoricalData(symbol)));

        // Make sure we have up-to-date data
        await this.fetchMarketData(symbols);

        // Generate signals using the ML model
        return tradingModel.generateSignals(symbols);
    }

    /**
     * Generate a trading signal for a single symbol
     */
    public async generateSignal(symbol: string): Promise<ModelPrediction | null> {
        if (!this.isInitialized) {
            throw new Error("TradingDataService is not initialized");
        }

        // Make sure we have historical data
        await this.ensureHistoricalData(symbol);

        // Make sure we have up-to-date data
        await this.fetchDataForSymbol(symbol);

        // Generate signal
        return tradingModel.generateSignal(symbol);
    }

    /**
     * Ensure we have sufficient historical data for the ML model
     */
    private async ensureHistoricalData(symbol: string): Promise<void> {
        if (this.historicalDataInitialized[symbol]) {
            return; // Already initialized
        }

        try {
            console.log(`Fetching historical data for ${symbol}...`);

            // Get current time
            const now = new Date();
            // Go back 1 month instead of 1 year
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);

            // Get historical data from Yahoo Finance
            const result = await yahooFinance.chart(symbol, {
                period1: oneMonthAgo.toISOString().split('T')[0], // Start date in YYYY-MM-DD
                period2: now.toISOString().split('T')[0],        // End date in YYYY-MM-DD
                interval: '1h'                                   // Hourly interval instead of daily
            });

            if (!result || !result.quotes || result.quotes.length < 50) {
                console.warn(`Insufficient historical data for ${symbol}. Received ${result?.quotes?.length || 0} data points.`);
                // Continue anyway, we'll use what we have
            }

            // Extract price and volume data for technical indicators
            const quotes = result.quotes || [];

            if (quotes.length === 0) {
                console.error(`No data available for ${symbol}`);
                this.historicalDataInitialized[symbol] = true; // Mark as initialized to prevent retries
                return;
            }

            const prices = quotes.map(q => q.close);
            const highs = quotes.map(q => q.high);
            const lows = quotes.map(q => q.low);
            const volumes = quotes.map(q => q.volume);

            const marketData: MarketData[] = quotes.map((quote, index) => {
                // Get quotes up to this point for calculating indicators
                const pricesUpToNow = prices.slice(0, index + 1);
                const highsUpToNow = highs.slice(0, index + 1);
                const lowsUpToNow = lows.slice(0, index + 1);
                const volumesUpToNow = volumes.slice(0, index + 1);
                const closesUpToNow = pricesUpToNow; // Same as prices

                // Filter out null values before calculating indicators
                const filteredPrices = pricesUpToNow.filter((price): price is number => price !== null && price !== undefined);
                const filteredHighs = highsUpToNow.filter((high): high is number => high !== null && high !== undefined);
                const filteredLows = lowsUpToNow.filter((low): low is number => low !== null && low !== undefined);
                const filteredVolumes = volumesUpToNow.filter((volume): volume is number => volume !== null && volume !== undefined);
                const filteredCloses = closesUpToNow.filter((close): close is number => close !== null && close !== undefined);

                // Calculate RSI (14-period)
                const rsi = calculateRSI(filteredPrices, 14);

                // Calculate MACD (12, 26, 9)
                const macdData = calculateMACD(filteredPrices, 12, 26, 9);
                // Calculate EMAs
                const ema20 = calculateEMA(filteredPrices, 20);
                const ema50 = calculateEMA(filteredPrices, 50);
                const ema200 = calculateEMA(filteredPrices, 200);
                // Calculate Bollinger Bands (20-period, 2 std dev)
                const bollingerBands = calculateBollingerBands(filteredPrices, 20, 2);

                // Calculate ATR (14-period)
                const atr = calculateATR(
                    filteredHighs,
                    filteredLows,
                    filteredCloses,
                    14
                );
                // Calculate OBV
                const obv = calculateOBV(filteredCloses, filteredVolumes);

                return {
                    symbol,
                    timestamp: new Date(quote.date).getTime(),
                    price: quote.close ?? 0,
                    open: quote.open ?? 0, // Use 0 as fallback for null values
                    high: quote.high ?? 0,
                    close: quote.close ?? 0,
                    low: quote.low ?? 0,
                    volume: quote.volume ?? 0,
                    // Technical indicators
                    rsi,
                    macd: macdData.macdLine,
                    macdSignal: macdData.signalLine,
                    macdHistogram: macdData.histogram,
                    ema20,
                    ema50,
                    ema200,
                    bollingerUpper: bollingerBands.upper,
                    bollingerMiddle: bollingerBands.middle,
                    bollingerLower: bollingerBands.lower,
                    atr,
                    obv
                };
            });

            // Update the cache with historical data
            this.marketDataCache[symbol] = marketData;

            // Update the ML model with this data
            tradingModel.addMarketData(symbol, marketData);

            // Mark as initialized
            this.historicalDataInitialized[symbol] = true;

            console.log(`Historical data loaded for ${symbol}: ${marketData.length} data points`);
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error);
            // We'll still mark it as initialized to prevent endless retries
            this.historicalDataInitialized[symbol] = true;
        }
    }

    /**
     * Fetch data for a single symbol and update the ML model
     */
    private async fetchDataForSymbol(symbol: string): Promise<void> {
        try {
            // Make sure we have historical data first
            if (!this.historicalDataInitialized[symbol]) {
                await this.ensureHistoricalData(symbol);
                return; // Historical data fetch already updated recent data
            }

            // For real-time/recent data, we use Yahoo Finance quote
            const quote = await yahooFinance.quote(symbol);

            if (!quote) {
                throw new Error(`Failed to fetch quote for ${symbol}`);
            }

            const timestamp = Date.now();
            const close = quote.regularMarketPrice;
            const open = quote.regularMarketOpen;
            const high = quote.regularMarketDayHigh;
            const low = quote.regularMarketDayLow;
            const volume = quote.regularMarketVolume;

            // Get previous data to help calculate indicators
            const previousData = this.marketDataCache[symbol] || [];

            if (previousData.length === 0) {
                throw new Error(`No historical data available for ${symbol}`);
            }

            // Extract historical prices for technical indicators
            const historicalPrices = extractPrices(previousData);
            const historicalHighs = extractHighs(previousData);
            const historicalLows = extractLows(previousData);
            const historicalVolumes = extractVolumes(previousData);

            // Add current price to the historical data for calculations
            const allPrices = [...historicalPrices, close];
            const allHighs = [...historicalHighs, high];
            const allLows = [...historicalLows, low];
            const allVolumes = [...historicalVolumes, volume];
            const allCloses = allPrices; // Same as allPrices
            // Calculate technical indicators
            // Filter out undefined values before calculating indicators
            const filteredPrices = allPrices.filter((price): price is number =>
                price !== undefined && price !== null);

            const rsi = calculateRSI(filteredPrices, 14);

            const macdData = calculateMACD(filteredPrices, 12, 26, 9);
            const ema20 = calculateEMA(filteredPrices, 20);
            const ema50 = calculateEMA(filteredPrices, 50);
            const ema200 = calculateEMA(filteredPrices, 200);

            const bollingerBands = calculateBollingerBands(filteredPrices, 20, 2);

            // Filter out undefined values for ATR calculation
            const filteredHighs = allHighs.filter((high): high is number => high !== null && high !== undefined);
            const filteredLows = allLows.filter((low): low is number => low !== null && low !== undefined);
            const filteredCloses = allCloses.filter((close): close is number => close !== null && close !== undefined);

            const atr = calculateATR(filteredHighs, filteredLows, filteredCloses, 14);

            // Filter out null/undefined values before calculating OBV
            const filteredVolumes = allVolumes.filter((volume): volume is number => volume !== null && volume !== undefined);
            const obv = calculateOBV(filteredCloses, filteredVolumes);

            const newDataPoint: MarketData = {
                symbol,
                timestamp,
                price: close ?? 0,
                open: open ?? 0,
                high: high ?? 0,
                close: close ?? 0,
                low: low ?? 0,
                volume: volume ?? 0,
                // Technical indicators
                rsi,
                macd: macdData.macdLine,
                macdSignal: macdData.signalLine,
                macdHistogram: macdData.histogram,
                ema20,
                ema50,
                ema200,
                bollingerUpper: bollingerBands.upper,
                bollingerMiddle: bollingerBands.middle,
                bollingerLower: bollingerBands.lower,
                atr,
                obv
            };

            // Update the cache
            this.marketDataCache[symbol] = [...previousData, newDataPoint];

            // Keep cache size manageable
            if (this.marketDataCache[symbol].length > 2000) {
                this.marketDataCache[symbol] = this.marketDataCache[symbol].slice(-2000);
            }

            // Update the ML model with this new data point
            tradingModel.addMarketData(symbol, [newDataPoint]);

        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);

            // Fall back to simulated data if Yahoo Finance fails
            console.log(`Falling back to simulated data for ${symbol}`);
            const simulatedData = this.generateSimulatedMarketData(symbol);

            // Update the cache
            const previousData = this.marketDataCache[symbol] || [];
            this.marketDataCache[symbol] = [...previousData, ...simulatedData];

            // Keep cache size manageable
            if (this.marketDataCache[symbol].length > 2000) {
                this.marketDataCache[symbol] = this.marketDataCache[symbol].slice(-2000);
            }

            // Update the ML model with this data
            tradingModel.addMarketData(symbol, simulatedData);
        }
    }

    /**
     * Generate simulated market data for testing purposes or when API fails
     */
    private generateSimulatedMarketData(symbol: string): MarketData[] {
        // Get current timestamp in milliseconds
        const currentTime = Date.now();

        // Check if we have previous data for this symbol
        const previousData = this.marketDataCache[symbol] || [];
        const lastPoint = previousData.length > 0 ? previousData[previousData.length - 1] : null;

        // Generate data points at 5-minute intervals going back 1 hour from now
        // (in a real app, we'd fetch actual market data)
        const result: MarketData[] = [];
        const intervalMs = 5 * 60 * 1000; // 5 minutes

        // Base price - either continue from last point or use a random starting point
        let basePrice = lastPoint ? lastPoint.close : 100 + Math.random() * 900; // Random price between 100 and 1000
        let baseVolume = lastPoint ? lastPoint.volume : 10000 + Math.random() * 90000; // Random volume between 10k and 100k

        // Generate data points
        for (let i = 0; i < 12; i++) { // 12 5-minute intervals = 1 hour
            // Skip if we already have data for this timestamp
            const timestamp = currentTime - ((11 - i) * intervalMs);
            if (previousData.some(d => Math.abs(d.timestamp - timestamp) < 1000)) {
                continue;
            }

            // Add some random price movement (more volatile for demo purposes)
            const priceChange = basePrice * (Math.random() * 0.02 - 0.01); // -1% to +1%
            basePrice += priceChange;

            // Generate high, low, open values
            const high = basePrice + (basePrice * Math.random() * 0.005); // Up to +0.5%
            const low = basePrice - (basePrice * Math.random() * 0.005); // Up to -0.5%
            const open = basePrice - priceChange * Math.random(); // Somewhere between previous close and current close

            // Change volume randomly
            baseVolume = baseVolume * (0.9 + Math.random() * 0.2); // +/- 10%

            // Calculate some basic technical indicators
            const rsi = 30 + Math.random() * 40; // Random RSI between 30 and 70
            const macd = Math.random() * 2 - 1; // Random MACD between -1 and 1
            const macdSignal = macd * (0.9 + Math.random() * 0.2); // MACD signal line
            const macdHistogram = macd - macdSignal;

            // EMAs would typically be calculated from price history, but for simulation:
            const ema20 = basePrice * (0.98 + Math.random() * 0.04); // Within 2% of current price
            const ema50 = basePrice * (0.97 + Math.random() * 0.06); // Within 3% of current price
            const ema200 = basePrice * (0.95 + Math.random() * 0.1); // Within 5% of current price

            // Bollinger bands (20-period, 2 standard deviations)
            const volatility = basePrice * (0.01 + Math.random() * 0.02); // 1-3% volatility
            const bollingerMiddle = ema20;
            const bollingerUpper = bollingerMiddle + (volatility * 2);
            const bollingerLower = bollingerMiddle - (volatility * 2);

            // ATR (Average True Range)
            const atr = volatility;

            // OBV (On-Balance Volume)
            const prevObv = lastPoint?.obv ?? 0;
            const obv = prevObv + (priceChange > 0 ? baseVolume : -baseVolume);

            result.push({
                symbol,
                timestamp,
                price: basePrice,
                open: open,
                high: high,
                close: basePrice,
                low: low,
                volume: Math.round(baseVolume),
                // Technical indicators
                rsi,
                macd,
                macdSignal,
                macdHistogram,
                ema20,
                ema50,
                ema200,
                bollingerUpper,
                bollingerMiddle,
                bollingerLower,
                atr,
                obv
            });
        }

        return result;
    }

    /**
     * Get market data for a symbol
     */
    public getMarketData(symbol: string): MarketData[] {
        return this.marketDataCache[symbol] || [];
    }

    /**
     * Get the last update timestamp
     */
    public getLastUpdateTimestamp(): number {
        return this.lastUpdateTimestamp;
    }
}

// Create and export a singleton instance
const tradingDataService = new TradingDataService();
export default tradingDataService; 