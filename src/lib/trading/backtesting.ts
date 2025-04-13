/**
 * Backtesting Module
 * 
 * This module provides functionality for backtesting trading strategies
 * against historical data to evaluate performance before live trading.
 */

import { MarketData } from '@/lib/ml/tradingModel';
import { TradingSignal, TradeResult } from './tradingBot';

// Backtesting types and interfaces

export interface BacktestConfig {
    initialCapital: number;
    symbols: string[];
    startDate: Date;
    endDate: Date;
    tradingFrequency: number; // minutes
    slippageModel: 'fixed' | 'variable' | 'none';
    slippageAmount: number; // percentage
    commission: number; // percentage
    useStopLoss: boolean;
    useTakeProfit: boolean;
    stopLossPercent: number;
    takeProfitPercent: number;
    riskPerTradePercent: number;
    maxOpenPositions: number;
    maxDrawdownPercent: number;
    modelConfidenceThreshold: number;
}

export interface BacktestPosition {
    symbol: string;
    entryPrice: number;
    quantity: number;
    entryTime: Date;
    stopLoss: number;
    takeProfit: number;
    exitPrice?: number;
    exitTime?: Date;
    pnl?: number;
    pnlPercent?: number;
    exitReason?: string;
}

export interface BacktestTrade {
    symbol: string;
    entryTime: Date;
    exitTime?: Date;
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    direction: 'LONG' | 'SHORT';
    pnl: number;
    pnlPercent: number;
    holdingPeriodHours: number;
    exitReason: string;
}

export interface BacktestResult {
    startDate: Date;
    endDate: Date;
    initialCapital: number;
    finalCapital: number;
    totalReturn: number;
    totalReturnPercent: number;
    annualizedReturn: number;
    trades: BacktestTrade[];
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    averageHoldingPeriodHours: number;
    equityCurve: { date: Date; equity: number }[];
    monthlyReturns: { month: string; return: number }[];
    symbolPerformance: { [symbol: string]: { trades: number; winRate: number; pnl: number } };
}

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
    initialCapital: 100000,
    symbols: [],
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    endDate: new Date(),
    tradingFrequency: 60, // 1 hour
    slippageModel: 'fixed',
    slippageAmount: 0.05, // 0.05%
    commission: 0.1, // 0.1%
    useStopLoss: true,
    useTakeProfit: true,
    stopLossPercent: 2.0,
    takeProfitPercent: 4.0,
    riskPerTradePercent: 1.0,
    maxOpenPositions: 5,
    maxDrawdownPercent: 20,
    modelConfidenceThreshold: 0.7
};

/**
 * Backtesting engine for evaluating trading strategies
 */
export class BacktestEngine {
    private config: BacktestConfig;
    private historicalData: { [symbol: string]: MarketData[] } = {};
    private currentTime: Date;
    private currentEquity: number;
    private initialEquity: number;
    private cash: number;
    private openPositions: BacktestPosition[] = [];
    private closedTrades: BacktestTrade[] = [];
    private equityCurve: { date: Date; equity: number }[] = [];
    private highWaterMark: number;

    constructor(config: Partial<BacktestConfig> = {}) {
        this.config = { ...DEFAULT_BACKTEST_CONFIG, ...config };
        this.currentTime = new Date(this.config.startDate);
        this.initialEquity = this.config.initialCapital;
        this.currentEquity = this.initialEquity;
        this.cash = this.initialEquity;
        this.highWaterMark = this.initialEquity;
        this.equityCurve.push({ date: new Date(this.currentTime), equity: this.currentEquity });
    }

    /**
     * Load historical market data for backtesting
     */
    public loadHistoricalData(symbol: string, data: MarketData[]): void {
        // Filter data to only include the backtest period
        const filteredData = data.filter(d => {
            const dataDate = new Date(d.timestamp);
            return dataDate >= this.config.startDate && dataDate <= this.config.endDate;
        });

        if (filteredData.length === 0) {
            console.warn(`No historical data found for ${symbol} in the specified date range`);
            return;
        }

        // Sort by timestamp
        this.historicalData[symbol] = filteredData.sort((a, b) => a.timestamp - b.timestamp);
        console.log(`Loaded ${filteredData.length} historical data points for ${symbol}`);
    }

    /**
     * Run the backtest
     */
    public async runBacktest(generateSignalFn: (data: MarketData) => TradingSignal | null): Promise<BacktestResult> {
        if (Object.keys(this.historicalData).length === 0) {
            throw new Error("No historical data loaded. Call loadHistoricalData() first.");
        }

        console.log(`Starting backtest from ${this.config.startDate.toDateString()} to ${this.config.endDate.toDateString()}`);

        // Process each time step
        while (this.currentTime <= this.config.endDate) {
            await this.processTimeStep(generateSignalFn);

            // Move to next time step
            this.currentTime = new Date(this.currentTime.getTime() + this.config.tradingFrequency * 60 * 1000);

            // Record equity for equity curve
            this.updateEquityCurve();
        }

        // Close any remaining positions at the end of the backtest
        this.closeAllPositions("End of backtest");

        // Calculate final results
        return this.calculateResults();
    }

    /**
     * Process a single time step in the backtest
     */
    private async processTimeStep(generateSignalFn: (data: MarketData) => TradingSignal | null): Promise<void> {
        // First check and update open positions (stop losses, take profits)
        this.updateOpenPositions();

        // Get current price data for all symbols
        const currentData: { [symbol: string]: MarketData | null } = {};
        for (const symbol of Object.keys(this.historicalData)) {
            currentData[symbol] = this.getCurrentMarketData(symbol);
        }

        // Skip if we don't have current data for any symbols
        if (Object.values(currentData).every(data => data === null)) {
            return;
        }

        // Generate trading signals from market data
        for (const symbol of Object.keys(currentData)) {
            const data = currentData[symbol];
            if (!data) continue;

            const signal = generateSignalFn(data);

            if (signal && signal.confidence >= this.config.modelConfidenceThreshold) {
                if (signal.action === 'BUY' && this.canOpenNewPosition()) {
                    this.executeEntry(signal);
                } else if (signal.action === 'SELL') {
                    // Find and close any matching position
                    const position = this.openPositions.find(p => p.symbol === signal.symbol);
                    if (position) {
                        this.closePosition(position, "Sell signal");
                    }
                }
            }
        }
    }

    /**
     * Check if we can open a new position based on max open positions
     */
    private canOpenNewPosition(): boolean {
        return this.openPositions.length < this.config.maxOpenPositions;
    }

    /**
     * Get current market data for a symbol at the current time step
     */
    private getCurrentMarketData(symbol: string): MarketData | null {
        const data = this.historicalData[symbol];
        if (!data || data.length === 0) return null;

        // Find the data point closest to current time that's not in the future
        for (let i = 0; i < data.length; i++) {
            const dataTime = new Date(data[i].timestamp);
            if (dataTime > this.currentTime) {
                return i > 0 ? data[i - 1] : null;
            }
        }

        // If we reach the end, return the last data point
        return data[data.length - 1];
    }

    /**
     * Execute entry for a new position
     */
    private executeEntry(signal: TradingSignal): void {
        const currentData = this.getCurrentMarketData(signal.symbol);
        if (!currentData) return;

        // Apply slippage to entry price
        const entryPrice = this.applySlippage(currentData.close, 'entry');

        // Calculate position size based on risk
        const riskAmount = this.currentEquity * (this.config.riskPerTradePercent / 100);
        const stopLossPrice = entryPrice * (1 - this.config.stopLossPercent / 100);
        const riskPerShare = entryPrice - stopLossPrice;

        // Ensure risk per share is not zero
        const quantity = riskPerShare > 0
            ? Math.floor(riskAmount / riskPerShare)
            : Math.floor(riskAmount / entryPrice * 0.01); // Default to 1% of equity if can't calculate risk

        if (quantity <= 0) return;

        const positionCost = quantity * entryPrice;
        if (positionCost > this.cash) return; // Not enough cash

        // Apply commission
        const commission = positionCost * (this.config.commission / 100);
        this.cash -= (positionCost + commission);

        // Create new position
        const position: BacktestPosition = {
            symbol: signal.symbol,
            entryPrice: entryPrice,
            quantity: quantity,
            entryTime: new Date(this.currentTime),
            stopLoss: stopLossPrice,
            takeProfit: entryPrice * (1 + this.config.takeProfitPercent / 100)
        };

        this.openPositions.push(position);
        console.log(`[${this.currentTime.toISOString()}] Opened position: ${position.symbol}, ${position.quantity} @ ${position.entryPrice}`);
    }

    /**
     * Update all open positions (check for stop loss / take profit)
     */
    private updateOpenPositions(): void {
        for (let i = this.openPositions.length - 1; i >= 0; i--) {
            const position = this.openPositions[i];
            const currentData = this.getCurrentMarketData(position.symbol);

            if (!currentData) continue;

            // Check stop loss if enabled
            if (this.config.useStopLoss && currentData.low <= position.stopLoss) {
                this.closePosition(position, "Stop loss", position.stopLoss);
                continue;
            }

            // Check take profit if enabled
            if (this.config.useTakeProfit && currentData.high >= position.takeProfit) {
                this.closePosition(position, "Take profit", position.takeProfit);
                continue;
            }
        }
    }

    /**
     * Close a position
     */
    private closePosition(position: BacktestPosition, reason: string, overridePrice?: number): void {
        const index = this.openPositions.indexOf(position);
        if (index === -1) return;

        const currentData = this.getCurrentMarketData(position.symbol);
        if (!currentData && !overridePrice) return;

        // Use override price if provided, otherwise use current close price
        let exitPrice = overridePrice || currentData!.close;

        // Apply slippage to exit price
        exitPrice = this.applySlippage(exitPrice, 'exit');

        // Calculate P&L
        const grossProfit = (exitPrice - position.entryPrice) * position.quantity;
        const exitValue = exitPrice * position.quantity;
        const commission = exitValue * (this.config.commission / 100);
        const netProfit = grossProfit - commission;
        const pnlPercent = (exitPrice / position.entryPrice - 1) * 100;

        // Add back to cash
        this.cash += (exitValue - commission);

        // Update current equity
        this.updateCurrentEquity();

        // Create trade record
        const holdingPeriodHours = (this.currentTime.getTime() - position.entryTime.getTime()) / (1000 * 60 * 60);

        const trade: BacktestTrade = {
            symbol: position.symbol,
            entryTime: position.entryTime,
            exitTime: new Date(this.currentTime),
            entryPrice: position.entryPrice,
            exitPrice: exitPrice,
            quantity: position.quantity,
            direction: 'LONG', // We're only doing long positions in this basic version
            pnl: netProfit,
            pnlPercent: pnlPercent,
            holdingPeriodHours: holdingPeriodHours,
            exitReason: reason
        };

        // Add to closed trades
        this.closedTrades.push(trade);

        // Remove from open positions
        this.openPositions.splice(index, 1);

        console.log(`[${this.currentTime.toISOString()}] Closed position: ${position.symbol}, P&L: ${netProfit.toFixed(2)} (${pnlPercent.toFixed(2)}%), Reason: ${reason}`);
    }

    /**
     * Close all remaining open positions
     */
    private closeAllPositions(reason: string): void {
        while (this.openPositions.length > 0) {
            this.closePosition(this.openPositions[0], reason);
        }
    }

    /**
     * Apply slippage to price
     */
    private applySlippage(price: number, type: 'entry' | 'exit'): number {
        if (this.config.slippageModel === 'none') return price;

        const slippageAmount = price * (this.config.slippageAmount / 100);

        if (this.config.slippageModel === 'fixed') {
            // For entries, increase price. For exits, decrease price.
            return type === 'entry' ? price + slippageAmount : price - slippageAmount;
        } else if (this.config.slippageModel === 'variable') {
            // Variable slippage - random amount up to max
            const randomFactor = Math.random();
            const variableSlippage = slippageAmount * randomFactor;
            return type === 'entry' ? price + variableSlippage : price - variableSlippage;
        }

        return price; // Default case
    }

    /**
     * Update the current equity value based on cash and open positions
     */
    private updateCurrentEquity(): void {
        let positionsValue = 0;

        for (const position of this.openPositions) {
            const currentData = this.getCurrentMarketData(position.symbol);
            if (currentData) {
                positionsValue += currentData.close * position.quantity;
            } else {
                positionsValue += position.entryPrice * position.quantity; // Use entry price if no current data
            }
        }

        this.currentEquity = this.cash + positionsValue;

        // Update high water mark for drawdown calculation
        if (this.currentEquity > this.highWaterMark) {
            this.highWaterMark = this.currentEquity;
        }
    }

    /**
     * Update the equity curve with current equity value
     */
    private updateEquityCurve(): void {
        this.updateCurrentEquity();
        this.equityCurve.push({
            date: new Date(this.currentTime),
            equity: this.currentEquity
        });
    }

    /**
     * Calculate final backtest results
     */
    private calculateResults(): BacktestResult {
        // Calculate basic metrics
        const winningTrades = this.closedTrades.filter(trade => trade.pnl > 0);
        const losingTrades = this.closedTrades.filter(trade => trade.pnl <= 0);

        const totalReturn = this.currentEquity - this.initialEquity;
        const totalReturnPercent = (totalReturn / this.initialEquity) * 100;

        // Calculate maximum drawdown
        let maxDrawdown = 0;
        let maxDrawdownPercent = 0;

        for (const point of this.equityCurve) {
            const drawdown = this.highWaterMark - point.equity;
            const drawdownPercent = (drawdown / this.highWaterMark) * 100;

            if (drawdownPercent > maxDrawdownPercent) {
                maxDrawdown = drawdown;
                maxDrawdownPercent = drawdownPercent;
            }
        }

        // Calculate average win and loss
        const totalWinAmount = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
        const totalLossAmount = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));

        const averageWin = winningTrades.length > 0 ? totalWinAmount / winningTrades.length : 0;
        const averageLoss = losingTrades.length > 0 ? totalLossAmount / losingTrades.length : 0;

        // Calculate profit factor
        const profitFactor = totalLossAmount !== 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? Infinity : 0;

        // Calculate annualized return
        const startTimestamp = this.config.startDate.getTime();
        const endTimestamp = this.config.endDate.getTime();
        const yearFraction = (endTimestamp - startTimestamp) / (365 * 24 * 60 * 60 * 1000);
        const annualizedReturn = Math.pow(1 + totalReturnPercent / 100, 1 / yearFraction) - 1;

        // Calculate Sharpe ratio (simplified)
        const dailyReturns: number[] = [];
        for (let i = 1; i < this.equityCurve.length; i++) {
            const prevEquity = this.equityCurve[i - 1].equity;
            const currentEquity = this.equityCurve[i].equity;
            dailyReturns.push((currentEquity - prevEquity) / prevEquity);
        }

        const avgDailyReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
        const stdDevDailyReturn = Math.sqrt(
            dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) / dailyReturns.length
        );

        const sharpeRatio = stdDevDailyReturn !== 0 ? (avgDailyReturn / stdDevDailyReturn) * Math.sqrt(252) : 0;

        // Calculate monthly returns
        const monthlyReturns: { month: string; return: number }[] = [];
        let monthlyData: { [month: string]: { start: number; end: number } } = {};

        for (const point of this.equityCurve) {
            const month = point.date.toISOString().substring(0, 7); // YYYY-MM format

            if (!monthlyData[month]) {
                monthlyData[month] = { start: point.equity, end: point.equity };
            } else {
                monthlyData[month].end = point.equity;
            }
        }

        for (const month in monthlyData) {
            const monthReturn = ((monthlyData[month].end / monthlyData[month].start) - 1) * 100;
            monthlyReturns.push({ month, return: monthReturn });
        }

        // Calculate per-symbol performance
        const symbolPerformance: { [symbol: string]: { trades: number; winRate: number; pnl: number } } = {};

        for (const symbol of Object.keys(this.historicalData)) {
            const symbolTrades = this.closedTrades.filter(trade => trade.symbol === symbol);
            const winningSymbolTrades = symbolTrades.filter(trade => trade.pnl > 0);
            const symbolPnl = symbolTrades.reduce((sum, trade) => sum + trade.pnl, 0);

            symbolPerformance[symbol] = {
                trades: symbolTrades.length,
                winRate: symbolTrades.length > 0 ? (winningSymbolTrades.length / symbolTrades.length) * 100 : 0,
                pnl: symbolPnl
            };
        }

        return {
            startDate: this.config.startDate,
            endDate: this.config.endDate,
            initialCapital: this.initialEquity,
            finalCapital: this.currentEquity,
            totalReturn,
            totalReturnPercent,
            annualizedReturn: annualizedReturn * 100,
            trades: this.closedTrades,
            winRate: this.closedTrades.length > 0 ? (winningTrades.length / this.closedTrades.length) * 100 : 0,
            totalTrades: this.closedTrades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            averageWin,
            averageLoss,
            largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
            largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
            profitFactor,
            sharpeRatio,
            maxDrawdown,
            maxDrawdownPercent,
            averageHoldingPeriodHours: this.closedTrades.length > 0
                ? this.closedTrades.reduce((sum, trade) => sum + trade.holdingPeriodHours, 0) / this.closedTrades.length
                : 0,
            equityCurve: this.equityCurve,
            monthlyReturns,
            symbolPerformance
        };
    }
} 