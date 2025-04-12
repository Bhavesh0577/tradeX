import yahooFinance from 'yahoo-finance2';

export default async function handler(req, res) {
    try {
        const { symbol = 'TATASTEEL.NS' } = req.query;

        // Get current time and one year ago
        const now = Date.now();
        const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

        // Convert to UNIX timestamps in seconds
        const period1 = Math.floor(oneYearAgo / 1000);
        const period2 = Math.floor(now / 1000);

        // Fetch historical data for the symbol
        const chartData = await yahooFinance.chart(symbol, { period1, period2, interval: '1h' });

        // Process the data for AI analysis
        const processedData = processChartData(chartData);

        // Call Gemini API for prediction
        const predictions = await callGeminiAPI(processedData, symbol);

        res.status(200).json(predictions);
    } catch (error) {
        console.error('Error generating AI predictions:', error);
        res.status(500).json({ error: 'Failed to generate AI predictions', message: error.message });
    }
}

// Process chart data for AI analysis
function processChartData(chartData) {
    if (!chartData || !chartData.quotes || !Array.isArray(chartData.quotes)) {
        return [];
    }

    // Extract the last 30 days of data for analysis
    const recentData = chartData.quotes.slice(-30);

    // Calculate additional technical indicators
    const processedData = recentData.map(quote => {
        return {
            date: new Date(quote.date).toISOString().split('T')[0],
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
            volume: quote.volume
        };
    });

    return processedData;
}

// Call Gemini API for prediction
async function callGeminiAPI(stockData, symbol) {
    try {
        // In a real implementation, you would use the Google Generative AI SDK
        // For now, we'll simulate the API call with a structured response

        // Calculate some basic indicators to make our simulation more realistic
        const lastPrice = stockData[stockData.length - 1]?.close || 0;
        const prevPrice = stockData[stockData.length - 2]?.close || 0;
        const priceChange = lastPrice - prevPrice;
        const priceChangePercent = (priceChange / prevPrice) * 100;

        // Calculate a simple moving average
        const prices = stockData.map(d => d.close);
        const sma5 = calculateSMA(prices, 5);
        const sma20 = calculateSMA(prices, 20);

        // Determine trend based on SMA crossover
        const currentSMA5 = sma5[sma5.length - 1] || 0;
        const currentSMA20 = sma20[sma20.length - 1] || 0;
        const prevSMA5 = sma5[sma5.length - 2] || 0;
        const prevSMA20 = sma20[sma20.length - 2] || 0;

        // Check for crossovers
        const bullishCrossover = prevSMA5 <= prevSMA20 && currentSMA5 > currentSMA20;
        const bearishCrossover = prevSMA5 >= prevSMA20 && currentSMA5 < currentSMA20;

        // Generate signals based on the last 5 days of data
        const signals = [];
        const lastFiveDays = stockData.slice(-5);

        lastFiveDays.forEach((day, index) => {
            // Skip the first day as we need previous data for comparison
            if (index === 0) return;

            const prevDay = lastFiveDays[index - 1];
            const currentDate = new Date(day.date);

            // Convert date to timestamp in seconds
            const timestamp = Math.floor(currentDate.getTime() / 1000);

            // Generate buy signal if price is increasing and volume is high
            if (day.close > prevDay.close && day.volume > prevDay.volume * 1.1) {
                signals.push({
                    time: timestamp,
                    position: "belowBar",
                    color: "#00BFFF", // Deep sky blue for AI buy
                    shape: "arrowUp",
                    text: "AI BUY"
                });
            }

            // Generate sell signal if price is decreasing and volume is high
            if (day.close < prevDay.close && day.volume > prevDay.volume * 1.1) {
                signals.push({
                    time: timestamp,
                    position: "aboveBar",
                    color: "#FF1493", // Deep pink for AI sell
                    shape: "arrowDown",
                    text: "AI SELL"
                });
            }
        });

        // Add signals based on SMA crossovers
        if (bullishCrossover) {
            const latestDay = stockData[stockData.length - 1];
            const latestDate = new Date(latestDay.date);
            signals.push({
                time: Math.floor(latestDate.getTime() / 1000),
                position: "belowBar",
                color: "#00BFFF",
                shape: "arrowUp",
                text: "AI BUY"
            });
        }

        if (bearishCrossover) {
            const latestDay = stockData[stockData.length - 1];
            const latestDate = new Date(latestDay.date);
            signals.push({
                time: Math.floor(latestDate.getTime() / 1000),
                position: "aboveBar",
                color: "#FF1493",
                shape: "arrowDown",
                text: "AI SELL"
            });
        }

        // Add the AI analysis
        return {
            symbol,
            lastPrice,
            priceChange,
            priceChangePercent,
            analysis: {
                summary: priceChange >= 0 ?
                    "The stock shows positive momentum with potential for further upside." :
                    "The stock shows negative momentum with potential for further downside.",
                technicalIndicators: {
                    sma5: currentSMA5,
                    sma20: currentSMA20,
                    trend: currentSMA5 > currentSMA20 ? "Bullish" : "Bearish",
                    momentum: priceChange >= 0 ? "Positive" : "Negative"
                },
                prediction: priceChange >= 0 ?
                    "Based on recent price action and technical indicators, the stock may continue its upward trend in the short term." :
                    "Based on recent price action and technical indicators, the stock may continue its downward trend in the short term."
            },
            signals
        };
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to get AI predictions');
    }
}

// Calculate Simple Moving Average
function calculateSMA(data, period) {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i >= period - 1) {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        } else {
            sma.push(null);
        }
    }
    return sma;
} 