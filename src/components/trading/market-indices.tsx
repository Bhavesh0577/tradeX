"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

interface IndexData {
    name: string;
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
}

const indexSymbols = [
    { symbol: "^NSEI", name: "Nifty 50" },
    { symbol: "^BSESN", name: "Sensex" },
    { symbol: "^CNXIT", name: "Nifty IT" },
    { symbol: "^CNXAUTO", name: "Nifty Auto" }
];

export function MarketIndices() {
    const [indices, setIndices] = useState<IndexData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIndicesData = async () => {
            setLoading(true);

            try {
                const indicesData = await Promise.all(
                    indexSymbols.map(async (index) => {
                        try {
                            const response = await fetch(`/api/finance?symbol=${index.symbol}`);
                            if (!response.ok) {
                                throw new Error(`Failed to fetch data for ${index.symbol}`);
                            }

                            const data = await response.json();
                            const meta = data.meta || {};
                            const price = meta.regularMarketPrice || 0;
                            const previousClose = meta.previousClose || price;
                            const change = price - previousClose;
                            const changePercent = (change / previousClose) * 100;

                            return {
                                name: index.name,
                                symbol: index.symbol,
                                price: price,
                                change: change,
                                changePercent: changePercent
                            };
                        } catch (err) {
                            console.error(`Error fetching data for ${index.symbol}:`, err);
                            return {
                                name: index.name,
                                symbol: index.symbol,
                                price: 0,
                                change: 0,
                                changePercent: 0
                            };
                        }
                    })
                );

                setIndices(indicesData);
            } catch (err) {
                console.error("Error fetching indices data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchIndicesData();

        // Refresh data every 5 minutes
        const intervalId = setInterval(fetchIndicesData, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="p-3 border-b border-gray-800">
            <h3 className="text-xs font-semibold mb-2 text-gray-400">INDICES</h3>

            {loading ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex justify-between">
                            <div className="h-3 w-20 bg-gray-700 rounded"></div>
                            <div className="h-3 w-16 bg-gray-700 rounded"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {indices.map((index) => (
                        <div key={index.symbol} className="flex justify-between items-center text-xs">
                            <div className="font-medium">{index.name}</div>
                            <div className="flex items-center">
                                <span className="font-medium">{index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <div className={`ml-2 flex items-center ${index.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {index.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                    <span className="ml-1">{index.changePercent.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 