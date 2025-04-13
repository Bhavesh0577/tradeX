/**
 * Automated Trading Bot
 * 
 * This module provides functionality for automated trading based on ML signals
 * It includes risk management, position sizing, and trade execution
 */

import { ModelPrediction } from '@/lib/ml/tradingModel';
import { toast } from 'sonner';

// Trading bot types and interfaces

export interface BotConfig {
    enabled: boolean;
    symbols: string[];
    tradingFrequency: number;  // minutes
    maxTradesPerDay: number;
    investmentPerTrade: number;
    minConfidence: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    brokerId: string;
    riskRewardRatio: number;
    useTrailingStop: boolean;
    trailingStopPercent: number;
    maxDrawdownPercent: number;
    notificationsEnabled: boolean;
}

export interface TradeResult {
    symbol: string;
    tradeType: string;
    price: number;
    quantity: number;
    timestamp: number;
    success: boolean;
    profitLoss?: number;
    reason?: string;
    message?: string; // For backward compatibility
    orderId?: string;
}

export interface PositionInfo {
    symbol: string;
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    stopLoss: number;
    takeProfit: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    entryTime: number;
}

export interface ModelPrediction {
    symbol: string;
    action: string;
    confidence: number;
    timestamp: string;
    price?: number;
    indicators?: {
        rsi: number;
        macd: number;
        ema50: number;
        ema200: number;
        priceChange24h: number;
        [key: string]: number;
    };
    reasoning?: string[];
}

export interface TradingSignal {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    price: number;
    confidence: number;
    timestamp: string;
    indicators: {
        rsi: number;
        macd: number;
        ema50: number;
        ema200: number;
        priceChange24h: number;
        [key: string]: number;
    };
    reasoning: string[];
}

export interface BotStatistics {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    portfolioValue: number;
    availableCapital: number;
    totalReturn: number;
    totalReturnPercent: number;
    dailyTradesRemaining: number;
    avgHoldingPeriod?: number;
    mostProfitableTrade?: string | number;
    biggestLoss?: string | number;
    lastUpdated: Date;
}

export interface PerformanceDataPoint {
    date: string;
    value: number;
    intraday?: {
        timestamp: string;
        value: number;
    }[];
}

export interface TradingBotResponse {
    isRunning: boolean;
    config: BotConfig;
    statistics: BotStatistics;
    activePositions: PositionInfo[];
    tradeHistory: TradeResult[];
    signals: { [key: string]: TradingSignal };
    performanceChart?: PerformanceDataPoint[];
}

// Default bot configuration
export const DEFAULT_BOT_CONFIG: BotConfig = {
    enabled: false,
    symbols: [],
    tradingFrequency: 15,  // 15 minutes
    maxTradesPerDay: 5,
    investmentPerTrade: 1000,
    minConfidence: 0.7,
    stopLossPercent: 2.0,
    takeProfitPercent: 4.0,
    brokerId: '',
    riskRewardRatio: 2.0,
    useTrailingStop: true,
    trailingStopPercent: 1.0,
    maxDrawdownPercent: 5.0,
    notificationsEnabled: true
};

/**
 * TradingBot class for automated trading
 */
export class TradingBot {
    private config: BotConfig;
    private isInitialized: boolean = false;
    private isRunning: boolean = false;
    private tradingInterval: NodeJS.Timeout | null = null;
    private recentSignals: Map<string, ModelPrediction> = new Map();
    private activePositions: Map<string, PositionInfo> = new Map();
    private tradeHistory: TradeResult[] = [];
    private dailyTradeCount: number = 0;
    private lastTradeReset: number = 0;
    private totalCapital: number = 0;
    private availableCapital: number = 0;

    constructor(config: Partial<BotConfig> = {}) {
        this.config = { ...DEFAULT_BOT_CONFIG, ...config };
    }

    /**
     * Initialize the trading bot
     */
    public async initialize(initialCapital: number): Promise<boolean> {
        try {
            console.log("Initializing TradingBot...");

            // Validate broker connection by checking if the brokerId is valid
            if (this.config.enabled && !this.config.brokerId) {
                console.error("Broker ID is required for automated trading");
                return false;
            }

            this.totalCapital = initialCapital;
            this.availableCapital = initialCapital;
            this.lastTradeReset = Date.now();

            this.isInitialized = true;
            console.log("TradingBot initialized successfully");
            return true;
        } catch (error) {
            console.error("Failed to initialize TradingBot:", error);
            return false;
        }
    }

    /**
     * Start automated trading
     */
    public start(): boolean {
        if (!this.isInitialized) {
            console.error("TradingBot not initialized. Call initialize() first.");
            return false;
        }

        if (this.isRunning) {
            console.warn("TradingBot is already running");
            return true;
        }

        try {
            console.log("Starting automated trading...");

            // Reset trade counter if it's a new day
            this.resetDailyTradeCountIfNeeded();

            // Set interval to fetch signals and execute trades
            this.tradingInterval = setInterval(
                () => this.tradingCycle(),
                this.config.tradingFrequency * 60 * 1000
            );

            this.isRunning = true;

            // Run the first cycle immediately
            this.tradingCycle();

            return true;
        } catch (error) {
            console.error("Failed to start automated trading:", error);
            return false;
        }
    }

    /**
     * Stop automated trading
     */
    public stop(): boolean {
        if (!this.isRunning) {
            console.warn("TradingBot is not running");
            return true;
        }

        try {
            console.log("Stopping automated trading...");

            if (this.tradingInterval) {
                clearInterval(this.tradingInterval);
                this.tradingInterval = null;
            }

            this.isRunning = false;
            return true;
        } catch (error) {
            console.error("Failed to stop automated trading:", error);
            return false;
        }
    }

    /**
     * Update bot configuration
     */
    public updateConfig(newConfig: Partial<BotConfig>): void {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };

        // Handle changes that require restarting the bot
        if (
            oldConfig.tradingFrequency !== this.config.tradingFrequency &&
            this.isRunning
        ) {
            this.stop();
            this.start();
        }
    }

    /**
     * Trading cycle - core logic for the trading bot
     */
    private async tradingCycle(): Promise<void> {
        try {
            // Reset trade counter if it's a new day
            this.resetDailyTradeCountIfNeeded();

            // Check if we can make more trades today
            if (this.dailyTradeCount >= this.config.maxTradesPerDay) {
                console.log("Maximum daily trades reached. Waiting for next reset.");
                return;
            }

            // Fetch trading signals for our symbols
            const signals = await this.fetchTradingSignals();

            // Manage existing positions (check stop losses, take profits)
            await this.managePositions();

            // Analyze signals and execute new trades if appropriate
            for (const [symbol, signal] of signals.entries()) {
                this.recentSignals.set(symbol, signal);

                // Skip if we already have a position for this symbol
                if (this.activePositions.has(symbol)) {
                    continue;
                }

                // Check signal confidence against our threshold
                if (
                    signal.action !== 'HOLD' &&
                    signal.confidence >= this.config.minConfidence
                ) {
                    // Calculate position size based on risk management
                    const positionSize = this.calculatePositionSize(signal);

                    // Execute the trade
                    if (positionSize > 0) {
                        const result = await this.executeTrade(signal, positionSize);

                        if (result.success) {
                            this.dailyTradeCount++;
                            this.tradeHistory.push(result);

                            // Update active positions
                            if (signal.action === 'BUY') {
                                this.activePositions.set(symbol, {
                                    symbol: signal.symbol,
                                    quantity: positionSize,
                                    entryPrice: result.price,
                                    entryTime: result.timestamp,
                                    currentPrice: result.price,
                                    stopLoss: this.calculateStopLoss(signal, result.price),
                                    takeProfit: this.calculateTakeProfit(signal, result.price),
                                    unrealizedPnL: 0,
                                    unrealizedPnLPercent: 0
                                });

                                // Update available capital
                                this.availableCapital -= result.price * positionSize;
                            }

                            // Notify user
                            if (this.config.notificationsEnabled) {
                                toast.success(
                                    `${signal.action} order executed for ${symbol} at $${result.price}`,
                                    { duration: 5000 }
                                );
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error in trading cycle:", error);

            if (this.config.notificationsEnabled) {
                toast.error(
                    `Trading cycle error: ${error.message}`,
                    { duration: 5000 }
                );
            }
        }
    }

    /**
     * Fetch trading signals for watched symbols
     */
    private async fetchTradingSignals(): Promise<Map<string, ModelPrediction>> {
        const signals = new Map<string, ModelPrediction>();

        try {
            const response = await fetch(
                `/api/ml-trading-signals?symbols=${this.config.symbols.join(',')}&forceRefresh=true`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch signals: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.signals) {
                for (const [symbol, signal] of Object.entries(data.signals)) {
                    signals.set(symbol, signal as ModelPrediction);
                }
            }
        } catch (error) {
            console.error("Error fetching trading signals:", error);
        }

        return signals;
    }

    /**
     * Manage existing positions (stop loss, take profit, trailing stop)
     */
    private async managePositions(): Promise<void> {
        for (const [symbol, position] of this.activePositions.entries()) {
            try {
                // Fetch current price
                const currentPrice = await this.fetchCurrentPrice(symbol);

                if (!currentPrice) continue;

                // Update position info
                position.currentPrice = currentPrice;
                position.unrealizedPnL = (currentPrice - position.entryPrice) * position.quantity;
                position.unrealizedPnLPercent = (currentPrice - position.entryPrice) / position.entryPrice * 100;

                // Check if we need to exit the position
                let shouldExit = false;
                let exitReason = '';

                // Stop loss hit
                if (currentPrice <= position.stopLoss) {
                    shouldExit = true;
                    exitReason = 'Stop loss triggered';
                }

                // Take profit hit
                if (currentPrice >= position.takeProfit) {
                    shouldExit = true;
                    exitReason = 'Take profit triggered';
                }

                // Update trailing stop if enabled
                if (
                    this.config.useTrailingStop &&
                    currentPrice > position.entryPrice
                ) {
                    const newStopLoss = currentPrice * (1 - this.config.trailingStopPercent / 100);

                    // Only move stop loss up, never down
                    if (newStopLoss > position.stopLoss) {
                        position.stopLoss = newStopLoss;
                    }
                }

                // Exit position if needed
                if (shouldExit) {
                    const result = await this.executeExitTrade(position, exitReason);

                    if (result.success) {
                        // Update capital
                        this.availableCapital += result.price * position.quantity;

                        // Remove from active positions
                        this.activePositions.delete(symbol);

                        // Add to trade history
                        this.tradeHistory.push(result);

                        // Notify user
                        if (this.config.notificationsEnabled) {
                            toast.info(
                                `${exitReason} for ${symbol}: ${result.tradeType} at $${result.price}`,
                                { duration: 5000 }
                            );
                        }
                    }
                }
            } catch (error) {
                console.error(`Error managing position for ${symbol}:`, error);
            }
        }
    }

    /**
     * Calculate position size based on risk management
     */
    private calculatePositionSize(signal: ModelPrediction): number {
        if (!signal.priceTarget || !signal.stopLoss) {
            return 0;
        }

        try {
            // Maximum amount to risk per trade based on config
            const maxRiskAmount = this.totalCapital * (this.config.maxDrawdownPercent / 100) / this.config.maxTradesPerDay;

            // Calculate risk per share
            const currentPrice = signal.price;
            const stopLossPrice = this.calculateStopLoss(signal, currentPrice);
            const riskPerShare = Math.abs(currentPrice - stopLossPrice);

            // Don't proceed if there's no risk (should never happen)
            if (riskPerShare <= 0) return 0;

            // Calculate position size based on risk
            const positionSize = Math.floor(maxRiskAmount / riskPerShare);

            // Ensure position doesn't exceed max investment per trade
            const maxShares = Math.floor(this.config.investmentPerTrade / currentPrice);
            const finalPositionSize = Math.min(positionSize, maxShares);

            // Check if we have enough capital
            const requiredCapital = finalPositionSize * currentPrice;
            if (requiredCapital > this.availableCapital) {
                const affordableShares = Math.floor(this.availableCapital / currentPrice);
                return Math.max(0, affordableShares);
            }

            return finalPositionSize;
        } catch (error) {
            console.error("Error calculating position size:", error);
            return 0;
        }
    }

    /**
     * Calculate stop loss price
     */
    private calculateStopLoss(signal: ModelPrediction, entryPrice: number): number {
        // If the ML model provided a stop loss, use it
        if (signal.stopLoss) {
            return signal.stopLoss;
        }

        // Otherwise calculate based on config
        if (signal.action === 'BUY') {
            return entryPrice * (1 - this.config.stopLossPercent / 100);
        } else {
            return entryPrice * (1 + this.config.stopLossPercent / 100);
        }
    }

    /**
     * Calculate take profit price
     */
    private calculateTakeProfit(signal: ModelPrediction, entryPrice: number): number {
        // If the ML model provided a price target, use it
        if (signal.priceTarget) {
            return signal.priceTarget;
        }

        // Otherwise calculate based on config
        if (signal.action === 'BUY') {
            return entryPrice * (1 + this.config.takeProfitPercent / 100);
        } else {
            return entryPrice * (1 - this.config.takeProfitPercent / 100);
        }
    }

    /**
     * Execute a trade based on a signal
     */
    private async executeTrade(
        signal: ModelPrediction,
        quantity: number
    ): Promise<TradeResult> {
        try {
            const response = await fetch('/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    symbol: signal.symbol,
                    quantity: quantity,
                    orderType: 'MARKET',
                    transactionType: signal.action,
                    brokerId: this.config.brokerId
                })
            });

            if (!response.ok) {
                throw new Error(`Trade execution failed: ${response.statusText}`);
            }

            const data = await response.json();

            return {
                success: data.success,
                orderId: data.orderId,
                tradeType: signal.action,
                symbol: signal.symbol,
                price: data.executionPrice || signal.price,
                quantity: quantity,
                timestamp: Date.now(),
                message: data.message
            };
        } catch (error) {
            console.error(`Error executing trade for ${signal.symbol}:`, error);

            return {
                success: false,
                tradeType: signal.action,
                symbol: signal.symbol,
                price: signal.price,
                quantity: quantity,
                timestamp: Date.now(),
                message: error.message
            };
        }
    }

    /**
     * Execute exit trade for a position
     */
    private async executeExitTrade(
        position: PositionInfo,
        reason: string
    ): Promise<TradeResult> {
        try {
            const response = await fetch('/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    symbol: position.symbol,
                    quantity: position.quantity,
                    orderType: 'MARKET',
                    transactionType: 'SELL', // Always sell to exit
                    brokerId: this.config.brokerId,
                    metadata: { exitReason: reason }
                })
            });

            if (!response.ok) {
                throw new Error(`Exit trade execution failed: ${response.statusText}`);
            }

            const data = await response.json();

            return {
                success: data.success,
                orderId: data.orderId,
                tradeType: 'SELL',
                symbol: position.symbol,
                price: data.executionPrice || position.currentPrice,
                quantity: position.quantity,
                timestamp: Date.now(),
                message: `${reason}: ${data.message}`
            };
        } catch (error) {
            console.error(`Error executing exit trade for ${position.symbol}:`, error);

            return {
                success: false,
                tradeType: 'SELL',
                symbol: position.symbol,
                price: position.currentPrice,
                quantity: position.quantity,
                timestamp: Date.now(),
                message: `${reason} failed: ${error.message}`
            };
        }
    }

    /**
     * Fetch current price for a symbol
     */
    private async fetchCurrentPrice(symbol: string): Promise<number | null> {
        try {
            const response = await fetch(`/api/quote?symbol=${symbol}`, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch price: ${response.statusText}`);
            }

            const data = await response.json();
            return data.price || null;
        } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
            return null;
        }
    }

    /**
     * Reset daily trade counter if needed
     */
    private resetDailyTradeCountIfNeeded(): void {
        const now = Date.now();
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);

        if (this.lastTradeReset < midnight.getTime()) {
            this.dailyTradeCount = 0;
            this.lastTradeReset = now;
            console.log("Reset daily trade counter");
        }
    }

    /**
     * Get trade history
     */
    public getTradeHistory(): TradeResult[] {
        return [...this.tradeHistory];
    }

    /**
     * Get active positions
     */
    public getActivePositions(): PositionInfo[] {
        return Array.from(this.activePositions.values());
    }

    /**
     * Get bot statistics
     */
    public getStatistics() {
        const totalTrades = this.tradeHistory.length;
        const winningTrades = this.tradeHistory.filter(trade =>
            trade.success && trade.tradeType === 'SELL' &&
            this.tradeHistory.some(prevTrade =>
                prevTrade.symbol === trade.symbol &&
                prevTrade.tradeType === 'BUY' &&
                prevTrade.price < trade.price
            )
        ).length;

        const losingTrades = this.tradeHistory.filter(trade =>
            trade.success && trade.tradeType === 'SELL' &&
            this.tradeHistory.some(prevTrade =>
                prevTrade.symbol === trade.symbol &&
                prevTrade.tradeType === 'BUY' &&
                prevTrade.price >= trade.price
            )
        ).length;

        const winRate = totalTrades > 0 ? winningTrades / totalTrades * 100 : 0;

        // Calculate portfolio value
        const portfolioValue = this.availableCapital +
            Array.from(this.activePositions.values()).reduce(
                (sum, pos) => sum + (pos.currentPrice * pos.quantity),
                0
            );

        const totalReturn = portfolioValue - this.totalCapital;
        const totalReturnPercent = this.totalCapital > 0 ?
            totalReturn / this.totalCapital * 100 : 0;

        return {
            totalTrades,
            winningTrades,
            losingTrades,
            winRate,
            portfolioValue,
            availableCapital: this.availableCapital,
            totalReturn,
            totalReturnPercent,
            dailyTradesRemaining: Math.max(0, this.config.maxTradesPerDay - this.dailyTradeCount)
        };
    }
}

// Create and export default instance
const tradingBot = new TradingBot();
export default tradingBot; 