"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StockInfoProps {
    symbol: string;
}

interface StockData {
    name: string;
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    marketCap?: number;
    exchange: string;
}

export function StockInfo({ symbol }: StockInfoProps) {
    const [stockData, setStockData] = useState<StockData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStockData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/finance?symbol=${symbol}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch data for ${symbol}`);
                }

                const data = await response.json();

                // Extract relevant data from the API response
                const meta = data.meta || {};
                const price = meta.regularMarketPrice || 0;
                const previousClose = meta.previousClose || price;
                const change = price - previousClose;
                const changePercent = (change / previousClose) * 100;

                setStockData({
                    name: meta.shortName || symbol,
                    symbol: symbol,
                    price: price,
                    change: change,
                    changePercent: changePercent,
                    open: meta.regularMarketOpen || 0,
                    high: meta.regularMarketDayHigh || 0,
                    low: meta.regularMarketDayLow || 0,
                    volume: meta.regularMarketVolume || 0,
                    marketCap: meta.marketCap,
                    exchange: meta.exchangeName || "NSE"
                });
            } catch (err) {
                console.error("Error fetching stock data:", err);
                setError(`Failed to fetch data for ${symbol}`);
            } finally {
                setLoading(false);
            }
        };

        fetchStockData();
    }, [symbol]);

    if (loading) {
        return (
            <div className="h-16 border-b border-gray-800 flex items-center justify-center">
                <div className="animate-pulse h-4 w-40 bg-gray-700 rounded"></div>
            </div>
        );
    }

    if (error || !stockData) {
        return (
            <div className="h-16 border-b border-gray-800 flex items-center px-4">
                <p className="text-red-500 text-sm">{error || "Failed to load stock data"}</p>
            </div>
        );
    }

    const isPositive = stockData.change >= 0;

    return (
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="font-bold text-lg">{stockData.name}</h2>
                    <div className="text-xs text-gray-400">{stockData.symbol} • {stockData.exchange}</div>
                </div>

                <div className="flex items-center">
                    <span className="text-xl font-semibold">
                        ₹{stockData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className={`ml-2 flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        <span className="text-sm ml-1">
                            ₹{Math.abs(stockData.change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-sm ml-1">
                            ({stockData.changePercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
            </div>

            <div className="hidden md:flex items-center gap-6 text-xs">
                <div>
                    <div className="text-gray-400">Open</div>
                    <div>₹{stockData.open.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div>
                    <div className="text-gray-400">High</div>
                    <div>₹{stockData.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div>
                    <div className="text-gray-400">Low</div>
                    <div>₹{stockData.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div>
                    <div className="text-gray-400">Volume</div>
                    <div>{stockData.volume.toLocaleString()}</div>
                </div>
                {stockData.marketCap && (
                    <div>
                        <div className="text-gray-400">Market Cap</div>
                        <div>₹{(stockData.marketCap / 10000000).toFixed(2)} Cr</div>
                    </div>
                )}
            </div>
        </div>
    );
} 