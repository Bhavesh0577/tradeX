import { CandlestickData, LineData, UTCTimestamp } from "lightweight-charts";
import { Marker } from "./chart-utils";

// Function to simulate AI predictions based on price patterns and volume
export const generateAIPredictions = (
    data: CandlestickData[],
    lookbackPeriod: number = 14
): Marker[] => {
    if (data.length < lookbackPeriod) {
        return [];
    }

    const markers: Marker[] = [];

    // Calculate some technical indicators for our "AI" model
    const rsi = calculateRSI(data, lookbackPeriod);
    const volatility = calculateVolatility(data, lookbackPeriod);
    const momentum = calculateMomentum(data, lookbackPeriod);

    // Start from lookbackPeriod to have enough data for our calculations
    for (let i = lookbackPeriod; i < data.length; i++) {
        // Simulate AI decision making with a combination of indicators
        const rsiValue = rsi[i - lookbackPeriod];
        const volatilityValue = volatility[i - lookbackPeriod];
        const momentumValue = momentum[i - lookbackPeriod];

        // Buy signal conditions (oversold + increasing momentum + reasonable volatility)
        if (rsiValue < 30 && momentumValue > 0 && volatilityValue < 0.15) {
            // Only add a buy signal if we don't have a recent one (within 5 candles)
            const recentBuy = markers.some(
                (m) =>
                    m.text === "AI BUY" &&
                    Math.abs(Number(m.time) - Number(data[i].time)) < 5 * 86400 // 5 days in seconds
            );

            if (!recentBuy) {
                markers.push({
                    time: data[i].time as UTCTimestamp,
                    position: "belowBar",
                    color: "#00BFFF", // Deep sky blue for AI buy
                    shape: "arrowUp",
                    text: "AI BUY"
                });
            }
        }

        // Sell signal conditions (overbought + decreasing momentum + high volatility)
        if (rsiValue > 70 && momentumValue < 0 && volatilityValue > 0.1) {
            // Only add a sell signal if we don't have a recent one (within 5 candles)
            const recentSell = markers.some(
                (m) =>
                    m.text === "AI SELL" &&
                    Math.abs(Number(m.time) - Number(data[i].time)) < 5 * 86400 // 5 days in seconds
            );

            if (!recentSell) {
                markers.push({
                    time: data[i].time as UTCTimestamp,
                    position: "aboveBar",
                    color: "#FF1493", // Deep pink for AI sell
                    shape: "arrowDown",
                    text: "AI SELL"
                });
            }
        }
    }

    return markers;
};

// Calculate Relative Strength Index (RSI)
const calculateRSI = (data: CandlestickData[], period: number): number[] => {
    const rsi: number[] = [];
    let avgGain = 0;
    let avgLoss = 0;

    // Calculate first average gain and loss
    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change >= 0) {
            avgGain += change;
        } else {
            avgLoss += Math.abs(change);
        }
    }

    avgGain /= period;
    avgLoss /= period;

    // Calculate RSI for the first period
    let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
    let rsiValue = 100 - (100 / (1 + rs));
    rsi.push(rsiValue);

    // Calculate RSI for the rest of the data
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        let gain = 0;
        let loss = 0;

        if (change >= 0) {
            gain = change;
        } else {
            loss = Math.abs(change);
        }

        // Use smoothed averages
        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;

        rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
        rsiValue = 100 - (100 / (1 + rs));
        rsi.push(rsiValue);
    }

    return rsi;
};

// Calculate price volatility (standard deviation of returns)
const calculateVolatility = (data: CandlestickData[], period: number): number[] => {
    const volatility: number[] = [];

    for (let i = period; i < data.length; i++) {
        const prices = data.slice(i - period, i).map(d => d.close);
        const returns = [];

        for (let j = 1; j < prices.length; j++) {
            returns.push((prices[j] - prices[j - 1]) / prices[j - 1]);
        }

        const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
        const squaredDiffs = returns.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        volatility.push(stdDev);
    }

    return volatility;
};

// Calculate price momentum
const calculateMomentum = (data: CandlestickData[], period: number): number[] => {
    const momentum: number[] = [];

    for (let i = period; i < data.length; i++) {
        // Simple momentum calculation: current price - price 'period' days ago
        const momentumValue = data[i].close - data[i - period].close;
        momentum.push(momentumValue);
    }

    return momentum;
};

// Function to combine traditional strategy signals with AI predictions
export const combineSignals = (
    traditionalSignals: Marker[],
    aiSignals: Marker[]
): Marker[] => {
    // Simply concatenate both arrays and sort by time
    const combinedSignals = [...traditionalSignals, ...aiSignals];
    combinedSignals.sort((a, b) => Number(a.time) - Number(b.time));

    return combinedSignals;
}; 