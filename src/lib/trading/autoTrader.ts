/**
 * AutoTrader - Fully Automated Trading System
 * 
 * This module implements a fully automated trading system that:
 * 1. Fetches hourly market data for the past month
 * 2. Generates trading signals using ML models
 * 3. Executes trades based on those signals
 * 4. Manages positions with stop-loss and take-profit
 */

import tradingDataService from '../ml/tradingDataService';
import { TradingBot, BotConfig, DEFAULT_BOT_CONFIG } from './tradingBot';
import { toast } from 'sonner';

interface AutoTraderConfig extends BotConfig {
    initialCapital: number;
    autoRun: boolean;
}

export const DEFAULT_AUTOTRADER_CONFIG: AutoTraderConfig = {
    ...DEFAULT_BOT_CONFIG,
    initialCapital: 100000,
    autoRun: false,
    tradingFrequency: 60, // 60 minutes (1 hour)
    minConfidence: 0.8,   // Higher confidence threshold for auto-trading
    maxTradesPerDay: 3    // More conservative trading frequency
};

export class AutoTrader {
    private tradingBot: TradingBot;
    private config: AutoTraderConfig;
    private isRunning: boolean = false;
    private statusCheckInterval: NodeJS.Timeout | null = null;

    constructor(config: Partial<AutoTraderConfig> = {}) {
        this.config = { ...DEFAULT_AUTOTRADER_CONFIG, ...config };
        this.tradingBot = new TradingBot(this.config);
    }

    /**
     * Initialize the auto trader
     */
    public async initialize(): Promise<boolean> {
        try {
            console.log("Initializing AutoTrader...");

            // Initialize trading data service
            const dataServiceInitialized = await tradingDataService.initialize();
            if (!dataServiceInitialized) {
                throw new Error("Failed to initialize trading data service");
            }

            // Initialize trading bot
            const tradingBotInitialized = await this.tradingBot.initialize(this.config.initialCapital);
            if (!tradingBotInitialized) {
                throw new Error("Failed to initialize trading bot");
            }

            // If autoRun is enabled, start the bot automatically
            if (this.config.autoRun) {
                this.start();
            }

            console.log("AutoTrader initialized successfully");
            return true;
        } catch (error) {
            console.error("Failed to initialize AutoTrader:", error);
            return false;
        }
    }

    /**
     * Start automated trading
     */
    public start(): boolean {
        if (this.isRunning) {
            console.warn("AutoTrader is already running");
            return true;
        }

        try {
            console.log("Starting AutoTrader...");

            // Start data updates for configured symbols
            tradingDataService.startDataUpdates(
                this.config.symbols,
                Math.max(1, Math.floor(this.config.tradingFrequency / 2))
            );

            // Start the trading bot
            const botStarted = this.tradingBot.start();
            if (!botStarted) {
                throw new Error("Failed to start trading bot");
            }

            // Set an interval to check the status periodically
            this.statusCheckInterval = setInterval(() => this.checkStatus(), 5 * 60 * 1000); // Check every 5 minutes

            this.isRunning = true;

            if (this.config.notificationsEnabled) {
                toast.success(`AutoTrader started successfully with ${this.config.symbols.length} symbols`);
            }

            return true;
        } catch (error) {
            console.error("Failed to start AutoTrader:", error);
            if (this.config.notificationsEnabled) {
                toast.error(`Failed to start AutoTrader: ${error}`);
            }
            return false;
        }
    }

    /**
     * Stop automated trading
     */
    public stop(): boolean {
        if (!this.isRunning) {
            console.warn("AutoTrader is not running");
            return true;
        }

        try {
            console.log("Stopping AutoTrader...");

            // Stop data updates
            tradingDataService.stopDataUpdates();

            // Stop the trading bot
            const botStopped = this.tradingBot.stop();
            if (!botStopped) {
                throw new Error("Failed to stop trading bot");
            }

            // Clear status check interval
            if (this.statusCheckInterval) {
                clearInterval(this.statusCheckInterval);
                this.statusCheckInterval = null;
            }

            this.isRunning = false;

            if (this.config.notificationsEnabled) {
                toast.success("AutoTrader stopped successfully");
            }

            return true;
        } catch (error) {
            console.error("Failed to stop AutoTrader:", error);
            if (this.config.notificationsEnabled) {
                toast.error(`Failed to stop AutoTrader: ${error}`);
            }
            return false;
        }
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<AutoTraderConfig>): void {
        const wasRunning = this.isRunning;

        // Stop if running
        if (wasRunning) {
            this.stop();
        }

        // Update config
        this.config = { ...this.config, ...newConfig };

        // Update trading bot config
        this.tradingBot.updateConfig(this.config);

        // Restart if was running
        if (wasRunning && this.config.enabled) {
            this.start();
        }
    }

    /**
     * Add symbols to track and trade
     */
    public addSymbols(symbols: string[]): void {
        const uniqueSymbols = [...new Set([...this.config.symbols, ...symbols])];
        this.updateConfig({ symbols: uniqueSymbols });
    }

    /**
     * Remove symbols from tracking
     */
    public removeSymbol(symbol: string): void {
        const updatedSymbols = this.config.symbols.filter(s => s !== symbol);
        this.updateConfig({ symbols: updatedSymbols });
    }

    /**
     * Check the status of the auto trader
     */
    private checkStatus(): void {
        const status = this.getStatus();

        console.log(`AutoTrader Status: ${status.isRunning ? 'Running' : 'Stopped'}`);
        console.log(`Monitoring ${status.config.symbols.length} symbols`);
        console.log(`Portfolio Value: $${status.statistics.portfolioValue.toFixed(2)}`);
        console.log(`Return: ${status.statistics.totalReturnPercent.toFixed(2)}%`);

        // Check if we need to adjust any settings based on performance
        this.adjustSettingsBasedOnPerformance(status);
    }

    /**
     * Adjust settings based on performance metrics
     */
    private adjustSettingsBasedOnPerformance(status: any): void {
        // Simple example of adaptive configuration
        // In a real system, this would be much more sophisticated

        // If win rate is below 40%, increase confidence threshold
        if (status.statistics.winRate < 40 && this.config.minConfidence < 0.9) {
            this.updateConfig({ minConfidence: this.config.minConfidence + 0.05 });
            console.log(`Adjusted min confidence to ${this.config.minConfidence} due to low win rate`);
        }

        // If drawdown is too high, reduce trades per day
        if (status.statistics.drawdownPercent > 3 && this.config.maxTradesPerDay > 1) {
            this.updateConfig({ maxTradesPerDay: this.config.maxTradesPerDay - 1 });
            console.log(`Reduced max trades to ${this.config.maxTradesPerDay} due to high drawdown`);
        }
    }

    /**
     * Get the current status of the auto trader
     */
    public getStatus() {
        return {
            isRunning: this.isRunning,
            config: this.config,
            statistics: this.tradingBot.getStatistics(),
            activePositions: this.tradingBot.getActivePositions(),
            tradeHistory: this.tradingBot.getTradeHistory()
        };
    }
}

// Create and export a singleton instance
const autoTrader = new AutoTrader();
export default autoTrader; 