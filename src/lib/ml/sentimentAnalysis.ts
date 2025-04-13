/**
 * Sentiment Analysis Module
 * 
 * This module provides functionality for analyzing market sentiment from
 * news articles, social media, and other textual data sources.
 */

import { MarketData } from './tradingModel';

// Sentiment types and interfaces

export interface NewsItem {
    title: string;
    content: string;
    source: string;
    url: string;
    timestamp: number;
    symbols: string[];
    categories: string[];
}

export interface SocialMediaPost {
    content: string;
    platform: 'twitter' | 'reddit' | 'stocktwits' | 'other';
    author: string;
    timestamp: number;
    likes: number;
    comments: number;
    shares: number;
    symbols: string[];
}

export interface SentimentScore {
    score: number; // -1.0 (extremely negative) to 1.0 (extremely positive)
    magnitude: number; // 0.0 to infinity, representing the strength of emotion
    bullishness: number; // 0.0 to 1.0
    bearishness: number; // 0.0 to 1.0
    neutrality: number; // 0.0 to 1.0
    fear: number; // 0.0 to 1.0
    greed: number; // 0.0 to 1.0
}

export interface EntitySentiment {
    entity: string;
    type: 'COMPANY' | 'SECTOR' | 'PRODUCT' | 'PERSON' | 'OTHER';
    mentions: number;
    salience: number; // 0.0 to 1.0, importance of entity in the text
    sentiment: SentimentScore;
}

export interface SentimentAnalysisResult {
    symbol: string;
    timestamp: number;
    overallSentiment: SentimentScore;
    entities: EntitySentiment[];
    recentNews: NewsItem[];
    recentSocialMedia: SocialMediaPost[];
    topKeywords: { word: string; count: number; sentiment: number }[];
    sources: { [source: string]: number }; // Count of mentions by source
}

export interface SentimentConfig {
    newsWeight: number;
    twitterWeight: number;
    redditWeight: number;
    stocktwitsWeight: number;
    analysisFrequency: number; // minutes
    lookbackPeriod: number; // hours
    minNewsItems: number;
    minSocialPosts: number;
    keywordFilterList: string[];
    useProfanityFilter: boolean;
    removeBots: boolean;
    sentimentAlgorithm: 'basic' | 'advanced' | 'nlp';
}

export const DEFAULT_SENTIMENT_CONFIG: SentimentConfig = {
    newsWeight: 0.6,
    twitterWeight: 0.15,
    redditWeight: 0.15,
    stocktwitsWeight: 0.1,
    analysisFrequency: 60, // 1 hour
    lookbackPeriod: 24, // 24 hours
    minNewsItems: 5,
    minSocialPosts: 10,
    keywordFilterList: [],
    useProfanityFilter: true,
    removeBots: true,
    sentimentAlgorithm: 'advanced'
};

/**
 * Sentiment analysis engine for financial market data
 */
export class SentimentAnalyzer {
    private config: SentimentConfig;
    private newsData: { [symbol: string]: NewsItem[] } = {};
    private socialData: { [symbol: string]: SocialMediaPost[] } = {};
    private sentimentCache: { [symbol: string]: SentimentAnalysisResult } = {};
    private lastAnalysisTime: { [symbol: string]: number } = {};

    constructor(config: Partial<SentimentConfig> = {}) {
        this.config = { ...DEFAULT_SENTIMENT_CONFIG, ...config };
    }

    /**
     * Add news data for analysis
     */
    public addNewsData(news: NewsItem[]): void {
        for (const item of news) {
            for (const symbol of item.symbols) {
                if (!this.newsData[symbol]) {
                    this.newsData[symbol] = [];
                }
                this.newsData[symbol].push(item);
            }
        }

        // Clean up old data
        this.cleanupOldData();
    }

    /**
     * Add social media data for analysis
     */
    public addSocialData(posts: SocialMediaPost[]): void {
        for (const post of posts) {
            for (const symbol of post.symbols) {
                if (!this.socialData[symbol]) {
                    this.socialData[symbol] = [];
                }
                this.socialData[symbol].push(post);
            }
        }

        // Clean up old data
        this.cleanupOldData();
    }

    /**
     * Get sentiment analysis for a symbol
     */
    public async getSentiment(symbol: string): Promise<SentimentAnalysisResult | null> {
        const now = Date.now();
        const lastAnalysis = this.lastAnalysisTime[symbol] || 0;

        // Return cached result if it's fresh enough
        if (this.sentimentCache[symbol] &&
            now - lastAnalysis < this.config.analysisFrequency * 60 * 1000) {
            return this.sentimentCache[symbol];
        }

        // Check if we have enough data
        const news = this.newsData[symbol] || [];
        const social = this.socialData[symbol] || [];

        const recentNews = this.getRecentData(news);
        const recentSocial = this.getRecentData(social);

        if (recentNews.length < this.config.minNewsItems && recentSocial.length < this.config.minSocialPosts) {
            console.warn(`Insufficient data for sentiment analysis of ${symbol}`);
            return null;
        }

        // Perform sentiment analysis
        const result = await this.analyzeSentiment(symbol, recentNews, recentSocial);

        // Cache result
        this.sentimentCache[symbol] = result;
        this.lastAnalysisTime[symbol] = now;

        return result;
    }

    /**
     * Get sentiment analysis for multiple symbols
     */
    public async getSentiments(symbols: string[]): Promise<{ [symbol: string]: SentimentAnalysisResult | null }> {
        const results: { [symbol: string]: SentimentAnalysisResult | null } = {};

        for (const symbol of symbols) {
            results[symbol] = await this.getSentiment(symbol);
        }

        return results;
    }

    /**
     * Clean up old data beyond lookback period
     */
    private cleanupOldData(): void {
        const cutoffTime = Date.now() - this.config.lookbackPeriod * 60 * 60 * 1000;

        // Clean news data
        for (const symbol in this.newsData) {
            this.newsData[symbol] = this.newsData[symbol].filter(item => item.timestamp >= cutoffTime);
        }

        // Clean social data
        for (const symbol in this.socialData) {
            this.socialData[symbol] = this.socialData[symbol].filter(post => post.timestamp >= cutoffTime);
        }
    }

    /**
     * Get recent data within lookback period
     */
    private getRecentData<T extends { timestamp: number }>(data: T[]): T[] {
        const cutoffTime = Date.now() - this.config.lookbackPeriod * 60 * 60 * 1000;
        return data.filter(item => item.timestamp >= cutoffTime);
    }

    /**
     * Perform sentiment analysis on data
     */
    private async analyzeSentiment(
        symbol: string,
        news: NewsItem[],
        social: SocialMediaPost[]
    ): Promise<SentimentAnalysisResult> {
        // For this implementation, we'll use a mock sentiment analysis

        // Extract entities and calculate sentiment scores
        const entities = this.extractEntities(symbol, [...news, ...social]);

        // Calculate overall sentiment based on weighted scores from different sources
        const newsSentiment = this.calculateNewsSentiment(news);
        const socialSentiment = this.calculateSocialSentiment(social);

        // Weighted average of different sources
        const overallSentiment: SentimentScore = {
            score: this.weightedAverage([
                { value: newsSentiment.score, weight: this.config.newsWeight },
                { value: socialSentiment.score, weight: this.config.twitterWeight + this.config.redditWeight + this.config.stocktwitsWeight }
            ]),
            magnitude: this.weightedAverage([
                { value: newsSentiment.magnitude, weight: this.config.newsWeight },
                { value: socialSentiment.magnitude, weight: this.config.twitterWeight + this.config.redditWeight + this.config.stocktwitsWeight }
            ]),
            bullishness: this.weightedAverage([
                { value: newsSentiment.bullishness, weight: this.config.newsWeight },
                { value: socialSentiment.bullishness, weight: this.config.twitterWeight + this.config.redditWeight + this.config.stocktwitsWeight }
            ]),
            bearishness: this.weightedAverage([
                { value: newsSentiment.bearishness, weight: this.config.newsWeight },
                { value: socialSentiment.bearishness, weight: this.config.twitterWeight + this.config.redditWeight + this.config.stocktwitsWeight }
            ]),
            neutrality: this.weightedAverage([
                { value: newsSentiment.neutrality, weight: this.config.newsWeight },
                { value: socialSentiment.neutrality, weight: this.config.twitterWeight + this.config.redditWeight + this.config.stocktwitsWeight }
            ]),
            fear: this.weightedAverage([
                { value: newsSentiment.fear, weight: this.config.newsWeight },
                { value: socialSentiment.fear, weight: this.config.twitterWeight + this.config.redditWeight + this.config.stocktwitsWeight }
            ]),
            greed: this.weightedAverage([
                { value: newsSentiment.greed, weight: this.config.newsWeight },
                { value: socialSentiment.greed, weight: this.config.twitterWeight + this.config.redditWeight + this.config.stocktwitsWeight }
            ])
        };

        // Extract top keywords by frequency
        const topKeywords = this.extractTopKeywords([...news, ...social]);

        // Count sources
        const sources: { [source: string]: number } = {};
        for (const item of news) {
            sources[item.source] = (sources[item.source] || 0) + 1;
        }

        return {
            symbol,
            timestamp: Date.now(),
            overallSentiment,
            entities,
            recentNews: news.slice(0, 10), // Take most recent 10 news items
            recentSocialMedia: social.slice(0, 10), // Take most recent 10 social posts
            topKeywords,
            sources
        };
    }

    /**
     * Extract entities from text
     */
    private extractEntities(symbol: string, data: (NewsItem | SocialMediaPost)[]): EntitySentiment[] {
        // In a real implementation, we would use NLP for entity extraction
        // This is a mock implementation

        // Start with the main symbol as an entity
        const result: EntitySentiment[] = [{
            entity: symbol,
            type: 'COMPANY',
            mentions: data.length,
            salience: 1.0,
            sentiment: this.createRandomSentiment(0.2, 0.6) // Slightly positive bias
        }];

        // Add some mock entities based on the symbol
        result.push(
            {
                entity: `${symbol} CEO`,
                type: 'PERSON',
                mentions: Math.floor(data.length * 0.3),
                salience: 0.7,
                sentiment: this.createRandomSentiment(-0.2, 0.4)
            },
            {
                entity: `${symbol} Products`,
                type: 'PRODUCT',
                mentions: Math.floor(data.length * 0.5),
                salience: 0.8,
                sentiment: this.createRandomSentiment(0.0, 0.5)
            },
            {
                entity: this.getSectorForSymbol(symbol),
                type: 'SECTOR',
                mentions: Math.floor(data.length * 0.4),
                salience: 0.6,
                sentiment: this.createRandomSentiment(-0.1, 0.4)
            }
        );

        return result;
    }

    /**
     * Calculate sentiment from news articles
     */
    private calculateNewsSentiment(news: NewsItem[]): SentimentScore {
        if (news.length === 0) {
            return this.createNeutralSentiment();
        }

        // Simple mock implementation
        const bullishArticles = Math.floor(news.length * (0.4 + Math.random() * 0.3)); // 40-70% bullish
        const bearishArticles = Math.floor(news.length * (0.2 + Math.random() * 0.2)); // 20-40% bearish
        const neutralArticles = news.length - bullishArticles - bearishArticles;

        const bullishness = bullishArticles / news.length;
        const bearishness = bearishArticles / news.length;
        const neutrality = neutralArticles / news.length;

        // Calculate sentiment score (-1 to 1)
        const score = bullishness - bearishness;

        // Calculate magnitude (0 to infinity)
        const magnitude = (bullishness + bearishness) * 2;

        return {
            score,
            magnitude,
            bullishness,
            bearishness,
            neutrality,
            fear: (bearishness * 0.7) + (Math.random() * 0.3), // A function of bearishness
            greed: (bullishness * 0.7) + (Math.random() * 0.3) // A function of bullishness
        };
    }

    /**
     * Calculate sentiment from social media posts
     */
    private calculateSocialSentiment(posts: SocialMediaPost[]): SentimentScore {
        if (posts.length === 0) {
            return this.createNeutralSentiment();
        }

        // Consider engagement metrics (likes, shares) for weighting
        let totalEngagement = 0;
        for (const post of posts) {
            totalEngagement += post.likes + post.shares + post.comments;
        }

        // Simple mock implementation
        const bullishPosts = Math.floor(posts.length * (0.3 + Math.random() * 0.4)); // 30-70% bullish
        const bearishPosts = Math.floor(posts.length * (0.2 + Math.random() * 0.3)); // 20-50% bearish
        const neutralPosts = posts.length - bullishPosts - bearishPosts;

        const bullishness = bullishPosts / posts.length;
        const bearishness = bearishPosts / posts.length;
        const neutrality = neutralPosts / posts.length;

        // Calculate sentiment score (-1 to 1)
        const score = bullishness - bearishness;

        // Calculate magnitude (0 to infinity)
        const magnitude = (bullishness + bearishness) * 2.5; // Social media tends to be more extreme

        return {
            score,
            magnitude,
            bullishness,
            bearishness,
            neutrality,
            fear: (bearishness * 0.8) + (Math.random() * 0.2), // Social media amplifies fear
            greed: (bullishness * 0.8) + (Math.random() * 0.2) // Social media amplifies greed
        };
    }

    /**
     * Extract top keywords from textual data
     */
    private extractTopKeywords(data: (NewsItem | SocialMediaPost)[]): { word: string; count: number; sentiment: number }[] {
        // In a real implementation, we would use NLP and keyword extraction
        // This is a mock implementation

        // Define common financial terms
        const keywords = [
            "earnings", "growth", "revenue", "profit", "loss", "increase", "decrease",
            "upgrade", "downgrade", "target", "price", "buy", "sell", "hold", "rating",
            "forecast", "guidance", "outlook", "analyst", "quarterly", "report", "dividend",
            "product", "launch", "partnership", "acquisition", "merger", "CEO", "executive",
            "competitor", "market", "share", "technology", "innovation", "regulation", "lawsuit"
        ];

        // Generate random occurrences and sentiment for each keyword
        const result = keywords.map(word => ({
            word,
            count: Math.floor(Math.random() * data.length * 0.7) + 1, // Random count
            sentiment: (Math.random() * 2 - 1) // Random sentiment between -1 and 1
        }));

        // Sort by frequency
        return result.sort((a, b) => b.count - a.count).slice(0, 15);
    }

    /**
     * Create a neutral sentiment score
     */
    private createNeutralSentiment(): SentimentScore {
        return {
            score: 0,
            magnitude: 0,
            bullishness: 0.33,
            bearishness: 0.33,
            neutrality: 0.34,
            fear: 0.2,
            greed: 0.2
        };
    }

    /**
     * Create a random sentiment score biased by a value
     */
    private createRandomSentiment(bias: number, intensity: number): SentimentScore {
        // Generate sentiment score with provided bias
        const score = Math.min(Math.max(bias + (Math.random() * 0.6 - 0.3), -1), 1);
        const magnitude = intensity + (Math.random() * 0.5);

        // Calculate bullish/bearish based on score
        let bullishness, bearishness, neutrality;

        if (score > 0) {
            bullishness = 0.5 + (score * 0.5);
            bearishness = 0.5 - (score * 0.3);
            neutrality = 1 - bullishness - bearishness;
        } else {
            bullishness = 0.5 - (Math.abs(score) * 0.3);
            bearishness = 0.5 + (Math.abs(score) * 0.5);
            neutrality = 1 - bullishness - bearishness;
        }

        return {
            score,
            magnitude,
            bullishness,
            bearishness,
            neutrality,
            fear: score < 0 ? 0.5 + Math.abs(score) * 0.5 : 0.5 - score * 0.3,
            greed: score > 0 ? 0.5 + score * 0.5 : 0.5 - Math.abs(score) * 0.3
        };
    }

    /**
     * Calculate weighted average
     */
    private weightedAverage(items: { value: number; weight: number }[]): number {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        if (totalWeight === 0) return 0;

        return items.reduce((sum, item) => sum + (item.value * item.weight), 0) / totalWeight;
    }

    /**
     * Get sector for a symbol (mock implementation)
     */
    private getSectorForSymbol(symbol: string): string {
        // Mock sector mapping
        const sectorMap: { [key: string]: string } = {
            'AAPL': 'Technology',
            'MSFT': 'Technology',
            'GOOGL': 'Technology',
            'AMZN': 'Consumer Cyclical',
            'META': 'Technology',
            'TSLA': 'Automotive',
            'JPM': 'Financial Services',
            'BAC': 'Financial Services',
            'WMT': 'Consumer Defensive',
            'PFE': 'Healthcare'
        };

        return sectorMap[symbol] || 'Unknown Sector';
    }

    /**
     * Get a combined trading signal based on sentiment
     */
    public getTradingSignal(sentimentResult: SentimentAnalysisResult): {
        action: 'BUY' | 'SELL' | 'HOLD';
        confidence: number;
        reason: string;
    } {
        const { overallSentiment } = sentimentResult;

        // Determine action based on sentiment score
        let action: 'BUY' | 'SELL' | 'HOLD';
        let confidence: number;
        let reason: string;

        if (overallSentiment.score > 0.3) {
            action = 'BUY';
            confidence = Math.min(0.5 + overallSentiment.score * 0.5, 0.95);
            reason = `Strong positive sentiment (${overallSentiment.score.toFixed(2)})`;
        } else if (overallSentiment.score < -0.3) {
            action = 'SELL';
            confidence = Math.min(0.5 + Math.abs(overallSentiment.score) * 0.5, 0.95);
            reason = `Strong negative sentiment (${overallSentiment.score.toFixed(2)})`;
        } else {
            action = 'HOLD';
            confidence = 0.5 - Math.abs(overallSentiment.score) * 0.5;
            reason = `Neutral sentiment (${overallSentiment.score.toFixed(2)})`;
        }

        // Adjust confidence based on magnitude
        confidence = Math.min(confidence * (0.7 + overallSentiment.magnitude * 0.3), 0.95);

        // If fear is very high, it might be a buy signal (contrarian)
        if (overallSentiment.fear > 0.8 && action === 'SELL') {
            action = 'BUY';
            confidence = Math.min(confidence * 0.8, 0.7);
            reason = `Contrarian signal: extreme fear detected (${overallSentiment.fear.toFixed(2)})`;
        }

        // If greed is very high, it might be a sell signal (contrarian)
        if (overallSentiment.greed > 0.8 && action === 'BUY') {
            action = 'SELL';
            confidence = Math.min(confidence * 0.8, 0.7);
            reason = `Contrarian signal: extreme greed detected (${overallSentiment.greed.toFixed(2)})`;
        }

        return { action, confidence, reason };
    }
} 