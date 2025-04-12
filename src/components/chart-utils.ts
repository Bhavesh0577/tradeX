import { LineData, CandlestickData, UTCTimestamp } from "lightweight-charts";

export interface Quote {
    open: number;
    high: number;
    low: number;
    close: number;
    date: string;
}

export interface Marker {
    time: UTCTimestamp;
    position: "aboveBar" | "belowBar";
    color: string;
    shape: "arrowUp" | "arrowDown";
    text: string;
}

// Helper function to calculate a Simple Moving Average (SMA)
export const calculateSMA = (data: CandlestickData[], period: number): LineData[] => {
    const sma: LineData[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i >= period - 1) {
            const sum = data
                .slice(i - period + 1, i + 1)
                .reduce((acc, curr) => acc + curr.close, 0);
            sma.push({ time: data[i].time, value: sum / period });
        }
    }
    return sma;
};

// Helper function to calculate an Exponential Moving Average (EMA)
export const calculateEMA = (data: CandlestickData[], period: number): LineData[] => {
    const ema: LineData[] = [];
    const k = 2 / (period + 1);
    let prevEma = 0;
    for (let i = 0; i < data.length; i++) {
        if (i === period - 1) {
            // Initialize EMA using the SMA of the first 'period' data points
            const sum = data.slice(0, period).reduce((acc, curr) => acc + curr.close, 0);
            prevEma = sum / period;
            ema.push({ time: data[i].time, value: prevEma });
        } else if (i >= period) {
            const currentEma = data[i].close * k + prevEma * (1 - k);
            ema.push({ time: data[i].time, value: currentEma });
            prevEma = currentEma;
        }
    }
    return ema;
};

// Function to find buy/sell signals based on EMA crossovers
export const findSignals = (shortEMA: LineData[], longEMA: LineData[]): Marker[] => {
    const markers: Marker[] = [];
    for (let i = 1; i < shortEMA.length && i < longEMA.length; i++) {
        if (shortEMA[i - 1].value < longEMA[i - 1].value && shortEMA[i].value > longEMA[i].value) {
            markers.push({
                time: shortEMA[i].time as UTCTimestamp,
                position: "belowBar",
                color: "green",
                shape: "arrowUp",
                text: "BUY"
            });
        } else if (shortEMA[i - 1].value > longEMA[i - 1].value && shortEMA[i].value < longEMA[i].value) {
            markers.push({
                time: shortEMA[i].time as UTCTimestamp,
                position: "aboveBar",
                color: "red",
                shape: "arrowDown",
                text: "SELL"
            });
        }
    }
    return markers;
};

// Function to process API data into chart-compatible format
export const processChartData = (data: any): CandlestickData[] => {
    if (data && data.quotes && Array.isArray(data.quotes)) {
        return data.quotes
            .filter(
                (entry: Quote) =>
                    typeof entry.open === "number" &&
                    typeof entry.high === "number" &&
                    typeof entry.low === "number" &&
                    typeof entry.close === "number"
            )
            .map((entry: Quote) => ({
                time: new Date(entry.date).getTime() / 1000 as UTCTimestamp,
                open: entry.open,
                high: entry.high,
                low: entry.low,
                close: entry.close,
            }));
    } else if (data && data.timestamp && Array.isArray(data.timestamp) && data.indicators && data.indicators.quote) {
        const timestamps = data.timestamp;
        const quotes = data.indicators.quote[0];

        if (timestamps.length > 0 && quotes) {
            return timestamps.map((time: number, index: number) => ({
                time: time as UTCTimestamp,
                open: quotes.open[index] || 0,
                high: quotes.high[index] || 0,
                low: quotes.low[index] || 0,
                close: quotes.close[index] || 0,
            }));
        }
    }

    throw new Error("Unexpected data format");
};

// Chart configuration options
export const getChartOptions = (width: number) => ({
    width: width,
    height: 400,
    layout: {
        background: { color: "#1e1e1e" },
        textColor: "#d1d1d1",
    },
    grid: {
        vertLines: { color: "#333333" },
        horzLines: { color: "#333333" },
    },
    crosshair: { mode: 1 },
    rightPriceScale: { borderColor: "#333333" },
    timeScale: { borderColor: "#333333" },
});

// Candlestick series options
export const getCandlestickOptions = () => ({
    upColor: "#00ff00",
    downColor: "#ff0000",
    borderVisible: false,
    wickUpColor: "#00ff00",
    wickDownColor: "#ff0000",
});

// SMA series options
export const getSMAOptions = () => ({
    color: "#ffa500", // Orange for SMA
    lineWidth: 2,
});

// EMA series options
export const getEMAOptions = () => ({
    color: "#00aaff", // Blue for EMA
    lineWidth: 2,
}); 