/**
 * Trading Visualization Module
 * 
 * This module provides functionality for visualizing trading model results,
 * backtest performance, and market data for analysis.
 */

import { MarketData } from '../ml/tradingModel';
import { BacktestResult, BacktestTrade } from '../trading/backtesting';
import { TradingSignal } from '../trading/tradingBot';
import { SentimentAnalysisResult } from '../ml/sentimentAnalysis';

// In a browser environment, this would use actual charting libraries
// For this implementation, we'll focus on data preparation

export interface ChartDataPoint {
    timestamp: number;
    value: number;
    label?: string;
    color?: string;
}

export interface ChartSeries {
    name: string;
    data: ChartDataPoint[];
    type: 'line' | 'bar' | 'scatter' | 'area' | 'candlestick';
    color?: string;
    visible?: boolean;
    yAxis?: number;
}

export interface ChartOptions {
    title: string;
    xAxisType: 'datetime' | 'category';
    yAxisType: 'linear' | 'logarithmic';
    showLegend: boolean;
    height?: number;
    annotations?: {
        points: {
            x: number;
            y: number;
            label: string;
            color: string;
        }[];
        lines: {
            value: number;
            axis: 'x' | 'y';
            label: string;
            color: string;
            dashStyle?: 'solid' | 'dash' | 'dot';
        }[];
    };
}

export interface ChartData {
    series: ChartSeries[];
    options: ChartOptions;
}

/**
 * TradingVisualizer class for creating visualization data
 */
export class TradingVisualizer {
    /**
     * Create price chart data from market data
     */
    public createPriceChart(symbol: string, data: MarketData[], signals?: TradingSignal[]): ChartData {
        // Create price series
        const priceSeries: ChartSeries = {
            name: `${symbol} Price`,
            type: 'line',
            data: data.map(d => ({
                timestamp: d.timestamp,
                value: d.close
            })),
            color: '#2962FF'
        };

        // Create volume series
        const volumeSeries: ChartSeries = {
            name: `${symbol} Volume`,
            type: 'bar',
            data: data.map(d => ({
                timestamp: d.timestamp,
                value: d.volume
            })),
            color: '#B2B5BE',
            yAxis: 1
        };

        // Create EMA series if available
        const series: ChartSeries[] = [priceSeries, volumeSeries];

        if (data[0].ema50) {
            series.push({
                name: 'EMA 50',
                type: 'line',
                data: data.map(d => ({
                    timestamp: d.timestamp,
                    value: d.ema50 || 0
                })),
                color: '#F44336'
            });
        }

        if (data[0].ema200) {
            series.push({
                name: 'EMA 200',
                type: 'line',
                data: data.map(d => ({
                    timestamp: d.timestamp,
                    value: d.ema200 || 0
                })),
                color: '#00E676'
            });
        }

        // Add trading signals if provided
        if (signals && signals.length > 0) {
            const signalPoints: ChartDataPoint[] = [];

            for (const signal of signals) {
                const timestamp = new Date(signal.timestamp).getTime();
                const dataPoint = data.find(d => Math.abs(d.timestamp - timestamp) < 1000 * 60 * 60); // Within 1 hour

                if (dataPoint) {
                    signalPoints.push({
                        timestamp: timestamp,
                        value: dataPoint.close,
                        label: signal.action,
                        color: signal.action === 'BUY' ? '#00E676' : signal.action === 'SELL' ? '#FF5252' : '#FFD600'
                    });
                }
            }

            if (signalPoints.length > 0) {
                series.push({
                    name: 'Trading Signals',
                    type: 'scatter',
                    data: signalPoints,
                    color: '#FF5252'
                });
            }
        }

        return {
            series,
            options: {
                title: `${symbol} Price Chart`,
                xAxisType: 'datetime',
                yAxisType: 'linear',
                showLegend: true
            }
        };
    }

    /**
     * Create technical indicator chart data
     */
    public createIndicatorChart(symbol: string, data: MarketData[]): ChartData {
        const series: ChartSeries[] = [];

        // RSI series
        if (data[0].rsi) {
            series.push({
                name: 'RSI',
                type: 'line',
                data: data.map(d => ({
                    timestamp: d.timestamp,
                    value: d.rsi || 50
                })),
                color: '#AB47BC'
            });
        }

        // MACD series
        if (data[0].macd && data[0].macdSignal) {
            series.push({
                name: 'MACD Line',
                type: 'line',
                data: data.map(d => ({
                    timestamp: d.timestamp,
                    value: d.macd || 0
                })),
                color: '#42A5F5'
            });

            series.push({
                name: 'MACD Signal',
                type: 'line',
                data: data.map(d => ({
                    timestamp: d.timestamp,
                    value: d.macdSignal || 0
                })),
                color: '#FF7043'
            });

            if (data[0].macdHistogram) {
                series.push({
                    name: 'MACD Histogram',
                    type: 'bar',
                    data: data.map(d => ({
                        timestamp: d.timestamp,
                        value: d.macdHistogram || 0,
                        color: (d.macdHistogram || 0) >= 0 ? '#00E676' : '#FF5252'
                    })),
                    color: '#00E676'
                });
            }
        }

        // Bollinger Bands
        if (data[0].bollingerUpper && data[0].bollingerMiddle && data[0].bollingerLower) {
            series.push({
                name: 'Bollinger Upper',
                type: 'line',
                data: data.map(d => ({
                    timestamp: d.timestamp,
                    value: d.bollingerUpper || 0
                })),
                color: '#78909C'
            });

            series.push({
                name: 'Bollinger Middle',
                type: 'line',
                data: data.map(d => ({
                    timestamp: d.timestamp,
                    value: d.bollingerMiddle || 0
                })),
                color: '#26A69A'
            });

            series.push({
                name: 'Bollinger Lower',
                type: 'line',
                data: data.map(d => ({
                    timestamp: d.timestamp,
                    value: d.bollingerLower || 0
                })),
                color: '#78909C'
            });
        }

        return {
            series,
            options: {
                title: `${symbol} Technical Indicators`,
                xAxisType: 'datetime',
                yAxisType: 'linear',
                showLegend: true,
                annotations: {
                    points: [],
                    lines: series[0]?.name === 'RSI' ? [
                        { value: 70, axis: 'y', label: 'Overbought', color: '#FF5252', dashStyle: 'dash' },
                        { value: 30, axis: 'y', label: 'Oversold', color: '#00E676', dashStyle: 'dash' }
                    ] : []
                }
            }
        };
    }

    /**
     * Create sentiment chart data
     */
    public createSentimentChart(symbol: string, sentimentData: SentimentAnalysisResult[]): ChartData {
        // Sort by timestamp
        const sortedData = [...sentimentData].sort((a, b) => a.timestamp - b.timestamp);

        const series: ChartSeries[] = [
            {
                name: 'Sentiment Score',
                type: 'line',
                data: sortedData.map(d => ({
                    timestamp: d.timestamp,
                    value: d.overallSentiment.score,
                    color: d.overallSentiment.score > 0 ? '#00E676' : '#FF5252'
                })),
                color: '#42A5F5'
            },
            {
                name: 'Sentiment Magnitude',
                type: 'line',
                data: sortedData.map(d => ({
                    timestamp: d.timestamp,
                    value: d.overallSentiment.magnitude
                })),
                color: '#FFA726'
            },
            {
                name: 'Fear Index',
                type: 'line',
                data: sortedData.map(d => ({
                    timestamp: d.timestamp,
                    value: d.overallSentiment.fear
                })),
                color: '#FF5252'
            },
            {
                name: 'Greed Index',
                type: 'line',
                data: sortedData.map(d => ({
                    timestamp: d.timestamp,
                    value: d.overallSentiment.greed
                })),
                color: '#FFD600'
            }
        ];

        return {
            series,
            options: {
                title: `${symbol} Sentiment Analysis`,
                xAxisType: 'datetime',
                yAxisType: 'linear',
                showLegend: true,
                annotations: {
                    points: [],
                    lines: [
                        { value: 0, axis: 'y', label: 'Neutral Sentiment', color: '#78909C', dashStyle: 'dash' }
                    ]
                }
            }
        };
    }

    /**
     * Create backtest performance chart
     */
    public createBacktestPerformanceChart(result: BacktestResult): ChartData {
        // Create equity curve series
        const equityCurve: ChartSeries = {
            name: 'Portfolio Equity',
            type: 'line',
            data: result.equityCurve.map(point => ({
                timestamp: point.date.getTime(),
                value: point.equity
            })),
            color: '#2962FF'
        };

        // Create drawdown series
        const drawdownSeries: ChartSeries = {
            name: 'Drawdown',
            type: 'area',
            data: this.calculateDrawdownSeries(result.equityCurve),
            color: '#FF5252',
            yAxis: 1
        };

        // Add trade markers
        const tradeSeries: ChartSeries = {
            name: 'Trades',
            type: 'scatter',
            data: result.trades.map(trade => ({
                timestamp: trade.exitTime ? trade.exitTime.getTime() : new Date().getTime(),
                value: trade.exitPrice || 0,
                label: `${trade.symbol}: $${trade.pnl.toFixed(2)}`,
                color: trade.pnl > 0 ? '#00E676' : '#FF5252'
            })),
            color: '#FF5252'
        };

        return {
            series: [equityCurve, drawdownSeries, tradeSeries],
            options: {
                title: 'Backtest Performance',
                xAxisType: 'datetime',
                yAxisType: 'linear',
                showLegend: true
            }
        };
    }

    /**
     * Create trade analysis chart
     */
    public createTradeAnalysisChart(trades: BacktestTrade[]): ChartData {
        // Calculate trade stats by day of week, hour of day, holding period, etc.
        const dayOfWeekPerformance = this.calculateDayOfWeekPerformance(trades);
        const hourOfDayPerformance = this.calculateHourOfDayPerformance(trades);
        const holdingPeriodPerformance = this.calculateHoldingPeriodPerformance(trades);

        return {
            series: [
                {
                    name: 'Day of Week Performance',
                    type: 'bar',
                    data: dayOfWeekPerformance,
                    color: '#42A5F5'
                },
                {
                    name: 'Hour of Day Performance',
                    type: 'bar',
                    data: hourOfDayPerformance,
                    color: '#26A69A',
                    visible: false
                },
                {
                    name: 'Holding Period Performance',
                    type: 'bar',
                    data: holdingPeriodPerformance,
                    color: '#FFA726',
                    visible: false
                }
            ],
            options: {
                title: 'Trade Analysis',
                xAxisType: 'category',
                yAxisType: 'linear',
                showLegend: true
            }
        };
    }

    /**
     * Create symbol comparison chart
     */
    public createSymbolComparisonChart(result: BacktestResult): ChartData {
        const symbolPerformance = result.symbolPerformance;
        const series: ChartSeries[] = [];

        // Create series for P&L by symbol
        series.push({
            name: 'P&L by Symbol',
            type: 'bar',
            data: Object.entries(symbolPerformance).map(([symbol, perf]) => ({
                timestamp: 0, // Not used for category charts
                value: perf.pnl,
                label: symbol,
                color: perf.pnl > 0 ? '#00E676' : '#FF5252'
            })),
            color: '#2962FF'
        });

        // Create series for win rate by symbol
        series.push({
            name: 'Win Rate by Symbol',
            type: 'bar',
            data: Object.entries(symbolPerformance).map(([symbol, perf]) => ({
                timestamp: 0, // Not used for category charts
                value: perf.winRate,
                label: symbol,
                color: '#FFA726'
            })),
            color: '#FFA726',
            visible: false
        });

        // Create series for trade count by symbol
        series.push({
            name: 'Trade Count by Symbol',
            type: 'bar',
            data: Object.entries(symbolPerformance).map(([symbol, perf]) => ({
                timestamp: 0, // Not used for category charts
                value: perf.trades,
                label: symbol,
                color: '#AB47BC'
            })),
            color: '#AB47BC',
            visible: false
        });

        return {
            series,
            options: {
                title: 'Symbol Comparison',
                xAxisType: 'category',
                yAxisType: 'linear',
                showLegend: true
            }
        };
    }

    /**
     * Calculate drawdown series from equity curve
     */
    private calculateDrawdownSeries(equityCurve: { date: Date; equity: number }[]): ChartDataPoint[] {
        const drawdown: ChartDataPoint[] = [];
        let highWaterMark = equityCurve[0]?.equity || 0;

        for (const point of equityCurve) {
            if (point.equity > highWaterMark) {
                highWaterMark = point.equity;
            }

            const drawdownValue = ((highWaterMark - point.equity) / highWaterMark) * 100;
            drawdown.push({
                timestamp: point.date.getTime(),
                value: drawdownValue
            });
        }

        return drawdown;
    }

    /**
     * Calculate performance by day of week
     */
    private calculateDayOfWeekPerformance(trades: BacktestTrade[]): ChartDataPoint[] {
        const dayPerformance: { [day: number]: { pnl: number; count: number } } = {
            0: { pnl: 0, count: 0 }, // Sunday
            1: { pnl: 0, count: 0 }, // Monday
            2: { pnl: 0, count: 0 }, // Tuesday
            3: { pnl: 0, count: 0 }, // Wednesday
            4: { pnl: 0, count: 0 }, // Thursday
            5: { pnl: 0, count: 0 }, // Friday
            6: { pnl: 0, count: 0 }  // Saturday
        };

        for (const trade of trades) {
            if (trade.exitTime) {
                const dayOfWeek = trade.exitTime.getDay();
                dayPerformance[dayOfWeek].pnl += trade.pnl;
                dayPerformance[dayOfWeek].count += 1;
            }
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return Object.entries(dayPerformance).map(([day, perf]) => ({
            timestamp: parseInt(day),
            value: perf.count > 0 ? perf.pnl / perf.count : 0, // Average P&L
            label: dayNames[parseInt(day)],
            color: perf.pnl > 0 ? '#00E676' : '#FF5252'
        }));
    }

    /**
     * Calculate performance by hour of day
     */
    private calculateHourOfDayPerformance(trades: BacktestTrade[]): ChartDataPoint[] {
        const hourPerformance: { [hour: number]: { pnl: number; count: number } } = {};

        // Initialize hours
        for (let i = 0; i < 24; i++) {
            hourPerformance[i] = { pnl: 0, count: 0 };
        }

        for (const trade of trades) {
            if (trade.exitTime) {
                const hourOfDay = trade.exitTime.getHours();
                hourPerformance[hourOfDay].pnl += trade.pnl;
                hourPerformance[hourOfDay].count += 1;
            }
        }

        return Object.entries(hourPerformance).map(([hour, perf]) => ({
            timestamp: parseInt(hour),
            value: perf.count > 0 ? perf.pnl / perf.count : 0, // Average P&L
            label: `${hour}:00`,
            color: perf.pnl > 0 ? '#00E676' : '#FF5252'
        }));
    }

    /**
     * Calculate performance by holding period
     */
    private calculateHoldingPeriodPerformance(trades: BacktestTrade[]): ChartDataPoint[] {
        // Group by holding period bins
        const bins: { [key: string]: { pnl: number; count: number } } = {
            '0-1h': { pnl: 0, count: 0 },
            '1-4h': { pnl: 0, count: 0 },
            '4-8h': { pnl: 0, count: 0 },
            '8-24h': { pnl: 0, count: 0 },
            '1-3d': { pnl: 0, count: 0 },
            '3d+': { pnl: 0, count: 0 }
        };

        for (const trade of trades) {
            let binKey: string;

            if (trade.holdingPeriodHours <= 1) {
                binKey = '0-1h';
            } else if (trade.holdingPeriodHours <= 4) {
                binKey = '1-4h';
            } else if (trade.holdingPeriodHours <= 8) {
                binKey = '4-8h';
            } else if (trade.holdingPeriodHours <= 24) {
                binKey = '8-24h';
            } else if (trade.holdingPeriodHours <= 72) {
                binKey = '1-3d';
            } else {
                binKey = '3d+';
            }

            bins[binKey].pnl += trade.pnl;
            bins[binKey].count += 1;
        }

        // Convert to chart data points
        const binOrder = ['0-1h', '1-4h', '4-8h', '8-24h', '1-3d', '3d+'];

        return binOrder.map((bin, index) => ({
            timestamp: index,
            value: bins[bin].count > 0 ? bins[bin].pnl / bins[bin].count : 0, // Average P&L
            label: bin,
            color: bins[bin].pnl > 0 ? '#00E676' : '#FF5252'
        }));
    }
} 