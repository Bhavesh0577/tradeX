/**
 * Technical Indicators Library
 * 
 * Provides functions for calculating common technical indicators for trading
 */

import { MarketData } from './tradingModel';

/**
 * Extract close prices from market data
 */
export function extractPrices(data: MarketData[]): number[] {
    return data.map(d => d.close);
}

/**
 * Extract high prices from market data
 */
export function extractHighs(data: MarketData[]): number[] {
    return data.map(d => d.high);
}

/**
 * Extract low prices from market data
 */
export function extractLows(data: MarketData[]): number[] {
    return data.map(d => d.low);
}

/**
 * Extract volumes from market data
 */
export function extractVolumes(data: MarketData[]): number[] {
    return data.map(d => d.volume);
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param prices Array of prices
 * @param period RSI period (typically 14)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) {
        return 50; // Default value if not enough data
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
        const difference = prices[i] - prices[i - 1];
        if (difference >= 0) {
            gains += difference;
        } else {
            losses -= difference;
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI using smoothed averages
    for (let i = period + 1; i < prices.length; i++) {
        const difference = prices[i] - prices[i - 1];

        if (difference >= 0) {
            avgGain = (avgGain * (period - 1) + difference) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) - difference) / period;
        }
    }

    if (avgLoss === 0) {
        return 100;
    }

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 * @param prices Array of prices
 * @param fastPeriod Fast EMA period (typically 12)
 * @param slowPeriod Slow EMA period (typically 26)
 * @param signalPeriod Signal EMA period (typically 9)
 */
export function calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
) {
    if (prices.length < Math.max(fastPeriod, slowPeriod) + signalPeriod) {
        return { macdLine: 0, signalLine: 0, histogram: 0 };
    }

    const fastEMA = calculateEMA(prices, fastPeriod);
    const slowEMA = calculateEMA(prices, slowPeriod);
    const macdLine = fastEMA - slowEMA;

    // Calculate signal line (EMA of MACD)
    const macdLineArray: number[] = [];
    for (let i = 0; i < prices.length; i++) {
        const fast = calculateEMA(prices.slice(0, i + 1), fastPeriod);
        const slow = calculateEMA(prices.slice(0, i + 1), slowPeriod);
        macdLineArray.push(fast - slow);
    }

    const signalLine = calculateEMA(macdLineArray.slice(-signalPeriod), signalPeriod);
    const histogram = macdLine - signalLine;

    return { macdLine, signalLine, histogram };
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param prices Array of prices
 * @param period EMA period
 */
export function calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) {
        return prices[prices.length - 1] || 0;
    }

    const k = 2 / (period + 1);

    // Calculate SMA as first EMA value
    let ema = prices.slice(0, period).reduce((total, price) => total + price, 0) / period;

    // Calculate EMA
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] * k) + (ema * (1 - k));
    }

    return ema;
}

/**
 * Calculate Bollinger Bands
 * @param prices Array of prices
 * @param period Period for moving average (typically 20)
 * @param stdDevMultiplier Multiplier for standard deviation (typically 2)
 */
export function calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDevMultiplier: number = 2
) {
    if (prices.length < period) {
        const lastPrice = prices[prices.length - 1] || 0;
        return {
            upper: lastPrice * 1.05,  // Default: 5% above price
            middle: lastPrice,
            lower: lastPrice * 0.95   // Default: 5% below price
        };
    }

    // Calculate SMA
    const sma = prices.slice(-period).reduce((total, price) => total + price, 0) / period;

    // Calculate standard deviation
    const squaredDifferences = prices.slice(-period).map(price => Math.pow(price - sma, 2));
    const variance = squaredDifferences.reduce((total, squaredDiff) => total + squaredDiff, 0) / period;
    const stdDev = Math.sqrt(variance);

    // Calculate bands
    const upper = sma + (stdDev * stdDevMultiplier);
    const lower = sma - (stdDev * stdDevMultiplier);

    return { upper, middle: sma, lower };
}

/**
 * Calculate Average True Range (ATR)
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param period ATR period (typically 14)
 */
export function calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14
): number {
    if (highs.length < period + 1 || lows.length < period + 1 || closes.length < period + 1) {
        return (highs[highs.length - 1] - lows[lows.length - 1]) || 0;
    }

    // Calculate true ranges
    const trueRanges: number[] = [];

    for (let i = 1; i < highs.length; i++) {
        const previousClose = closes[i - 1];
        const tr1 = highs[i] - lows[i];
        const tr2 = Math.abs(highs[i] - previousClose);
        const tr3 = Math.abs(lows[i] - previousClose);
        trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    // Initial ATR is simple average of first 'period' true ranges
    let atr = trueRanges.slice(0, period).reduce((total, tr) => total + tr, 0) / period;

    // Calculate smoothed ATR
    for (let i = period; i < trueRanges.length; i++) {
        atr = ((atr * (period - 1)) + trueRanges[i]) / period;
    }

    return atr;
}

/**
 * Calculate On-Balance Volume (OBV)
 * @param prices Array of close prices
 * @param volumes Array of volumes
 */
export function calculateOBV(prices: number[], volumes: number[]): number {
    if (prices.length < 2 || volumes.length < 2) {
        return volumes[volumes.length - 1] || 0;
    }

    let obv = 0;

    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i - 1]) {
            obv += volumes[i];
        } else if (prices[i] < prices[i - 1]) {
            obv -= volumes[i];
        }
        // If prices are equal, OBV remains unchanged
    }

    return obv;
} 