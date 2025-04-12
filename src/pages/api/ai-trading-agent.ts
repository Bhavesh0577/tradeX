import { NextApiRequest, NextApiResponse } from 'next';
import yahooFinance from 'yahoo-finance2';
import { getAuth } from '@clerk/nextjs/server';

// Technical indicators utility functions
function calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) {
        return 50; // Default neutral value if not enough data
    }

    let gains = 0;
    let losses = 0;

    // Calculate average gain and loss over the first period
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change >= 0) {
            gains += change;
        } else {
            losses -= change; // Make losses positive
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI for the remaining data points
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];

        if (change >= 0) {
            // Smooth average gain
            avgGain = (avgGain * (period - 1) + change) / period;
            // No loss, smooth average loss
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            // No gain, smooth average gain
            avgGain = (avgGain * (period - 1)) / period;
            // Smooth average loss (change is negative, so we use -change)
            avgLoss = (avgLoss * (period - 1) - change) / period;
        }
    }

    // Calculate RS and RSI
    if (avgLoss === 0) {
        return 100; // No losses, RSI is 100
    }

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) {
        return prices[prices.length - 1]; // Return last price if not enough data
    }

    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period; // Initial SMA

    // Calculate EMA for the rest of the data
    for (let i = period; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
}

function calculateMACD(prices: number[]): { macd: number, signal: number, histogram: number } {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macd = ema12 - ema26;

    // Calculate signal line (9-day EMA of MACD)
    const macdHistory = prices.map((_, i) => {
        if (i < 26) return 0;
        const slice = prices.slice(0, i + 1);
        return calculateEMA(slice, 12) - calculateEMA(slice, 26);
    }).slice(-9);

    const signal = calculateEMA(macdHistory, 9);
    const histogram = macd - signal;

    return { macd, signal, histogram };
}

interface TradeSignal {
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
    };
    reasoning: string[];
}

interface ExecutedTrade {
    signal: TradeSignal;
    success: boolean;
    orderId?: string;
    message?: string;
}

async function analyzeStock(symbol: string): Promise<TradeSignal> {
    try {
        // Get current time
        const now = Date.now();
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago

        // Convert to UNIX timestamps in seconds
        const period1 = Math.floor(oneMonthAgo / 1000);
        const period2 = Math.floor(now / 1000);

        // Fetch historical data
        const chartData = await yahooFinance.chart(symbol, {
            period1,
            period2,
            interval: '1d'
        });

        if (!chartData || !chartData.quotes || chartData.quotes.length < 10) {
            throw new Error(`Insufficient data for ${symbol}`);
        }

        // Extract closing prices
        const closingPrices = chartData.quotes.map(quote => quote.close);
        const latestPrice = closingPrices[closingPrices.length - 1] ?? 0;
        const previousPrice = closingPrices[closingPrices.length - 2] ?? 0;
        const priceChange24h = previousPrice ? ((latestPrice - previousPrice) / previousPrice) * 100 : 0;

        // Calculate technical indicators
        const filteredPrices = closingPrices.filter((price): price is number => price !== null);
        const rsi = calculateRSI(filteredPrices);
        const macdData = calculateMACD(filteredPrices);
        const ema50 = calculateEMA(filteredPrices, 50);
        const ema200 = calculateEMA(filteredPrices, 200);

        // Initialize reasoning array
        const reasoning: string[] = [];

        // Determine trade action based on multiple factors
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 0.5; // Default neutral confidence

        // RSI analysis
        if (rsi < 30) {
            reasoning.push(`RSI is oversold at ${rsi.toFixed(2)}`);
            confidence += 0.15;
            action = 'BUY';
        } else if (rsi > 70) {
            reasoning.push(`RSI is overbought at ${rsi.toFixed(2)}`);
            confidence += 0.15;
            action = 'SELL';
        } else {
            reasoning.push(`RSI is neutral at ${rsi.toFixed(2)}`);
        }

        // MACD analysis
        if (macdData.histogram > 0 && macdData.histogram > macdData.signal * 0.1) {
            reasoning.push('MACD histogram is positive and increasing');
            if (action !== 'SELL') {
                confidence += 0.1;
                if (action === 'HOLD') action = 'BUY';
            } else {
                confidence -= 0.05; // Conflicting signal
            }
        } else if (macdData.histogram < 0 && macdData.histogram < macdData.signal * 0.1) {
            reasoning.push('MACD histogram is negative and decreasing');
            if (action !== 'BUY') {
                confidence += 0.1;
                if (action === 'HOLD') action = 'SELL';
            } else {
                confidence -= 0.05; // Conflicting signal
            }
        } else {
            reasoning.push('MACD is showing neutral signals');
        }

        // Moving average analysis
        if (ema50 > ema200) {
            reasoning.push('Price is above 50-day EMA and 200-day EMA (bullish)');
            if (action !== 'SELL') {
                confidence += 0.1;
                if (action === 'HOLD') action = 'BUY';
            } else {
                confidence -= 0.05; // Conflicting signal
            }
        } else if (ema50 < ema200) {
            reasoning.push('Price is below 50-day EMA and 200-day EMA (bearish)');
            if (action !== 'BUY') {
                confidence += 0.1;
                if (action === 'HOLD') action = 'SELL';
            } else {
                confidence -= 0.05; // Conflicting signal
            }
        }

        // Recent price movement
        if (priceChange24h > 3) {
            reasoning.push(`Price jumped ${priceChange24h.toFixed(2)}% in last 24h (potential overbought)`);
            if (action !== 'BUY') {
                confidence += 0.05;
                if (action === 'HOLD') action = 'SELL';
            }
        } else if (priceChange24h < -3) {
            reasoning.push(`Price dropped ${priceChange24h.toFixed(2)}% in last 24h (potential oversold)`);
            if (action !== 'SELL') {
                confidence += 0.05;
                if (action === 'HOLD') action = 'BUY';
            }
        }

        // Cap confidence at 0.95
        confidence = Math.min(confidence, 0.95);

        return {
            symbol,
            action,
            price: latestPrice,
            confidence,
            timestamp: new Date().toISOString(),
            indicators: {
                rsi,
                macd: macdData.macd,
                ema50,
                ema200,
                priceChange24h
            },
            reasoning
        };
    } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
        throw error;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get authenticated user
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // For GET requests, analyze a specific symbol
        if (req.method === 'GET') {
            const { symbol } = req.query;

            if (!symbol || Array.isArray(symbol)) {
                return res.status(400).json({ error: 'Symbol parameter is required' });
            }

            const analysis = await analyzeStock(symbol);
            return res.status(200).json(analysis);
        }

        // For POST requests, analyze a list of symbols and potentially execute trades
        if (req.method === 'POST') {
            const { symbols, autoTrade = false, brokerId } = req.body;

            if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
                return res.status(400).json({ error: 'Symbols array is required' });
            }

            if (autoTrade && !brokerId) {
                return res.status(400).json({ error: 'Broker ID is required for auto-trading' });
            }

            // Analyze each symbol
            const analysisPromises = symbols.map(analyzeStock);
            const analysisResults = await Promise.allSettled(analysisPromises);

            const tradeSignals = analysisResults
                .filter((result): result is PromiseFulfilledResult<TradeSignal> => result.status === 'fulfilled')
                .map(result => result.value);

            const errors = analysisResults
                .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
                .map(result => ({
                    symbol: symbols[analysisResults.indexOf(result)],
                    error: result.reason.message
                }));

            // If auto-trading is enabled, execute trades for strong signals
            const executedTrades: ExecutedTrade[] = [];
            if (autoTrade) {
                const strongSignals = tradeSignals.filter(signal =>
                    (signal.action !== 'HOLD' && signal.confidence > 0.7)
                );

                for (const signal of strongSignals) {
                    try {
                        // Execute the trade via the trade API
                        const tradeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/trade`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                // Pass the user's session token
                                'Authorization': req.headers.authorization || ''
                            },
                            body: JSON.stringify({
                                symbol: signal.symbol,
                                quantity: 1, // Default quantity, in production this would be calculated based on portfolio size
                                orderType: 'MARKET',
                                transactionType: signal.action,
                                brokerId
                            })
                        });

                        const tradeResult = await tradeResponse.json();

                        executedTrades.push({
                            signal,
                            success: tradeResult.success,
                            orderId: tradeResult.orderId,
                            message: tradeResult.message
                        });
                    } catch (error) {
                        console.error(`Error executing trade for ${signal.symbol}:`, error);
                        executedTrades.push({
                            signal,
                            success: false,
                            message: error.message
                        });
                    }
                }
            }

            return res.status(200).json({
                signals: tradeSignals,
                errors,
                executedTrades: autoTrade ? executedTrades : []
            });
        }
    } catch (error) {
        console.error('Error in AI trading agent:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
} 