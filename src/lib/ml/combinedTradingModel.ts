/**
 * Combined Trading Model
 * 
 * This module integrates technical analysis, sentiment analysis, and backtesting
 * to create a comprehensive trading strategy.
 */

import { MarketData, ModelPrediction, TradingEnsembleModel } from './tradingModel';
import { SentimentAnalyzer, SentimentAnalysisResult } from './sentimentAnalysis';
import { BacktestEngine, BacktestConfig, BacktestResult } from '../trading/backtesting';
import { TradingSignal } from '../trading/tradingBot';

export interface CombinedModelConfig {
    technicalWeight: number;
    sentimentWeight: number;
    minTechnicalConfidence: number;
    minSentimentConfidence: number;
    minCombinedConfidence: number;
    useSentimentFilter: boolean;
    useTechnicalFilter: boolean;
    enableContrarian: boolean;
    contraryThreshold: number;
    timeframes: ('1m' | '5m' | '15m' | '1h' | '4h' | '1d')[];
    primaryTimeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
}

export const DEFAULT_COMBINED_CONFIG: CombinedModelConfig = {
    technicalWeight: 0.7,
    sentimentWeight: 0.3,
    minTechnicalConfidence: 0.6,
    minSentimentConfidence: 0.6,
    minCombinedConfidence: 0.65,
    useSentimentFilter: true,
    useTechnicalFilter: true,
    enableContrarian: false,
    contraryThreshold: 0.85,
    timeframes: ['15m', '1h', '4h', '1d'],
    primaryTimeframe: '1h'
};

/**
 * CombinedTradingModel integrates technical and sentiment analysis
 */
export class CombinedTradingModel {
    private config: CombinedModelConfig;
    private technicalModel: TradingEnsembleModel;
    private sentimentAnalyzer: SentimentAnalyzer;
    private backtestEngine: BacktestEngine | null = null;

    constructor(
        technicalModel: TradingEnsembleModel,
        sentimentAnalyzer: SentimentAnalyzer,
        config: Partial<CombinedModelConfig> = {}
    ) {
        this.config = { ...DEFAULT_COMBINED_CONFIG, ...config };
        this.technicalModel = technicalModel;
        this.sentimentAnalyzer = sentimentAnalyzer;
    }

    /**
     * Generate a combined trading signal
     */
    public async generateSignal(symbol: string, data: MarketData): Promise<TradingSignal | null> {
        try {
            // Get technical analysis signal
            const technicalSignal = await this.technicalModel.generateSignal(symbol);

            // Get sentiment analysis
            const sentimentResult = await this.sentimentAnalyzer.getSentiment(symbol);

            // If either is null and required, return null
            if (this.config.useTechnicalFilter && !technicalSignal) {
                console.warn(`No technical signal available for ${symbol}`);
                return null;
            }

            if (this.config.useSentimentFilter && !sentimentResult) {
                console.warn(`No sentiment data available for ${symbol}`);
                return null;
            }

            // If both are null, return null
            if (!technicalSignal && !sentimentResult) {
                return null;
            }

            // Convert sentiment to trading signal
            const sentimentSignal = sentimentResult
                ? this.sentimentAnalyzer.getTradingSignal(sentimentResult)
                : null;

            // Combine the signals
            return this.combineSignals(symbol, data, technicalSignal, sentimentSignal, sentimentResult);
        } catch (error) {
            console.error(`Error generating combined signal for ${symbol}:`, error);
            return null;
        }
    }

    /**
     * Combine technical and sentiment signals
     */
    private combineSignals(
        symbol: string,
        data: MarketData,
        technicalSignal: ModelPrediction | null,
        sentimentSignal: { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number; reason: string } | null,
        sentimentResult: SentimentAnalysisResult | null
    ): TradingSignal {
        // Extract or default the individual signals
        const technical = technicalSignal ? {
            action: technicalSignal.action as 'BUY' | 'SELL' | 'HOLD',
            confidence: technicalSignal.confidence,
            reason: `Technical: ${this.technicalReasonSummary(technicalSignal)}`
        } : { action: 'HOLD' as const, confidence: 0.5, reason: 'No technical signal' };

        const sentiment = sentimentSignal || {
            action: 'HOLD' as const,
            confidence: 0.5,
            reason: 'No sentiment signal'
        };

        // Check if signals conflict
        const conflictingSignals = technical.action !== sentiment.action &&
            technical.action !== 'HOLD' &&
            sentiment.action !== 'HOLD';

        // Determine the final action based on weighted confidence
        let action: 'BUY' | 'SELL' | 'HOLD';
        let finalConfidence: number;
        let reasoning: string[] = [];

        // Add the reasons
        reasoning.push(technical.reason);
        reasoning.push(sentiment.reason);

        // Decision logic for conflicting signals
        if (conflictingSignals) {
            // For conflicting signals, take the one with higher confidence
            if (technical.confidence * this.config.technicalWeight >
                sentiment.confidence * this.config.sentimentWeight) {
                action = technical.action;
                finalConfidence = technical.confidence * 0.8; // Reduce confidence due to conflict
                reasoning.push(`Conflict resolved in favor of technical analysis (${technical.confidence.toFixed(2)} > ${sentiment.confidence.toFixed(2)})`);
            } else {
                action = sentiment.action;
                finalConfidence = sentiment.confidence * 0.8; // Reduce confidence due to conflict
                reasoning.push(`Conflict resolved in favor of sentiment analysis (${sentiment.confidence.toFixed(2)} > ${technical.confidence.toFixed(2)})`);
            }
        } else {
            // For agreeing signals or if one is HOLD, combine them
            if (technical.action === 'HOLD' && sentiment.action !== 'HOLD') {
                action = sentiment.action;
                finalConfidence = sentiment.confidence * 0.9; // Slightly reduce confidence
                reasoning.push(`Technical is neutral, using sentiment signal`);
            } else if (sentiment.action === 'HOLD' && technical.action !== 'HOLD') {
                action = technical.action;
                finalConfidence = technical.confidence * 0.9; // Slightly reduce confidence
                reasoning.push(`Sentiment is neutral, using technical signal`);
            } else if (technical.action === 'HOLD' && sentiment.action === 'HOLD') {
                action = 'HOLD';
                finalConfidence = Math.max(technical.confidence, sentiment.confidence);
                reasoning.push(`Both signals are neutral`);
            } else {
                // Both agree on BUY or SELL
                action = technical.action; // Same as sentiment.action
                finalConfidence = (
                    technical.confidence * this.config.technicalWeight +
                    sentiment.confidence * this.config.sentimentWeight
                ) / (this.config.technicalWeight + this.config.sentimentWeight);
                reasoning.push(`Signals agree on ${action}, combined confidence: ${finalConfidence.toFixed(2)}`);
            }
        }

        // Contrarian logic (optional)
        if (this.config.enableContrarian && sentimentResult) {
            if (sentimentResult.overallSentiment.fear > this.config.contraryThreshold && action === 'SELL') {
                action = 'BUY';
                finalConfidence = Math.min(finalConfidence * 0.8, 0.7);
                reasoning.push(`Contrarian signal: high fear (${sentimentResult.overallSentiment.fear.toFixed(2)}) suggests buying opportunity`);
            } else if (sentimentResult.overallSentiment.greed > this.config.contraryThreshold && action === 'BUY') {
                action = 'SELL';
                finalConfidence = Math.min(finalConfidence * 0.8, 0.7);
                reasoning.push(`Contrarian signal: high greed (${sentimentResult.overallSentiment.greed.toFixed(2)}) suggests selling opportunity`);
            }
        }

        // Check minimum confidence threshold
        if (finalConfidence < this.config.minCombinedConfidence) {
            action = 'HOLD';
            reasoning.push(`Final confidence (${finalConfidence.toFixed(2)}) below threshold (${this.config.minCombinedConfidence}), defaulting to HOLD`);
        }

        // Extract indicators from technical signal or create default ones
        const indicators = technicalSignal?.models ? this.extractIndicatorsFromTechnical(technicalSignal) : {
            rsi: 50,
            macd: 0,
            ema50: data.close,
            ema200: data.close,
            priceChange24h: 0
        };

        // Add sentiment indicators if available
        if (sentimentResult) {
            indicators.sentimentScore = sentimentResult.overallSentiment.score;
            indicators.sentimentMagnitude = sentimentResult.overallSentiment.magnitude;
            indicators.fearIndex = sentimentResult.overallSentiment.fear;
            indicators.greedIndex = sentimentResult.overallSentiment.greed;
        }

        return {
            symbol,
            action,
            price: data.close,
            confidence: finalConfidence,
            timestamp: new Date(data.timestamp).toISOString(),
            indicators,
            reasoning
        };
    }

    /**
     * Extract a summary of technical reasons from the model prediction
     */
    private technicalReasonSummary(prediction: ModelPrediction): string {
        const models = prediction.models;
        const modelSummaries = [];

        for (const model in models) {
            modelSummaries.push(`${model} (${models[model].prediction}, ${models[model].confidence.toFixed(2)})`);
        }

        return `${prediction.action} with ${prediction.confidence.toFixed(2)} confidence from models: ${modelSummaries.join(', ')}`;
    }

    /**
     * Extract indicators from technical signal
     */
    private extractIndicatorsFromTechnical(technicalSignal: ModelPrediction): { [key: string]: number } {
        const result: { [key: string]: number } = {};

        // Extract any indicators available in the technical signal
        if (typeof technicalSignal.price === 'object' && technicalSignal.price !== null) {
            const marketData = technicalSignal.price as any;

            if (marketData.rsi) result.rsi = marketData.rsi;
            if (marketData.macd) result.macd = marketData.macd;
            if (marketData.ema50) result.ema50 = marketData.ema50;
            if (marketData.ema200) result.ema200 = marketData.ema200;

            // Calculate 24h price change if possible
            if (marketData.close && marketData.open) {
                result.priceChange24h = ((marketData.close - marketData.open) / marketData.open) * 100;
            }
        }

        // Default values for missing indicators
        if (!result.rsi) result.rsi = 50;
        if (!result.macd) result.macd = 0;
        if (typeof technicalSignal.price === 'number') {
            if (!result.ema50) result.ema50 = technicalSignal.price;
            if (!result.ema200) result.ema200 = technicalSignal.price;
            if (!result.priceChange24h) result.priceChange24h = 0;
        }

        return result;
    }

    /**
     * Setup backtesting
     */
    public setupBacktesting(config: Partial<BacktestConfig>): BacktestEngine {
        this.backtestEngine = new BacktestEngine(config);
        return this.backtestEngine;
    }

    /**
     * Run backtest with current model configuration
     */
    public async runBacktest(historicalData: { [symbol: string]: MarketData[] }): Promise<BacktestResult | null> {
        if (!this.backtestEngine) {
            throw new Error("Backtest engine not initialized. Call setupBacktesting() first.");
        }

        // Load historical data
        for (const symbol in historicalData) {
            this.backtestEngine.loadHistoricalData(symbol, historicalData[symbol]);
        }

        // Create signal generator function for the backtest
        const generateSignalFn = async (data: MarketData): Promise<TradingSignal | null> => {
            return await this.generateSignal(data.symbol, data);
        };

        // Run the backtest
        return await this.backtestEngine.runBacktest(generateSignalFn);
    }

    /**
     * Update model configuration
     */
    public updateConfig(config: Partial<CombinedModelConfig>): void {
        this.config = { ...this.config, ...config };
    }
} 