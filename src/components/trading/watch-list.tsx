"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Star, Plus, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/custom-button";

interface WatchListProps {
    selectedSymbol: string;
    onSelectSymbol: (symbol: string) => void;
}

interface StockItem {
    name: string;
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    isFavorite: boolean;
}

// Default watchlist stocks
const defaultStocks = [
    { symbol: "RELIANCE.NS", name: "Reliance" },
    { symbol: "TCS.NS", name: "TCS" },
    { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
    { symbol: "INFY.NS", name: "Infosys" },
    { symbol: "TATASTEEL.NS", name: "Tata Steel" },
    { symbol: "SBIN.NS", name: "SBI" },
    { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
    { symbol: "AXISBANK.NS", name: "Axis Bank" },
    { symbol: "WIPRO.NS", name: "Wipro" },
    { symbol: "HINDUNILVR.NS", name: "HUL" }
];

export function WatchList({ selectedSymbol, onSelectSymbol }: WatchListProps) {
    const [stocks, setStocks] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        const fetchStocksData = async () => {
            setLoading(true);

            try {
                // Get saved favorites from localStorage
                const savedFavorites = localStorage.getItem('favoriteStocks');
                const favorites = savedFavorites ? JSON.parse(savedFavorites) : [];

                const stocksData = await Promise.all(
                    defaultStocks.map(async (stock) => {
                        try {
                            const response = await fetch(`/api/finance?symbol=${stock.symbol}`);
                            if (!response.ok) {
                                throw new Error(`Failed to fetch data for ${stock.symbol}`);
                            }

                            const data = await response.json();
                            const meta = data.meta || {};
                            const price = meta.regularMarketPrice || 0;
                            const previousClose = meta.previousClose || price;
                            const change = price - previousClose;
                            const changePercent = (change / previousClose) * 100;

                            return {
                                name: stock.name,
                                symbol: stock.symbol,
                                price: price,
                                change: change,
                                changePercent: changePercent,
                                isFavorite: favorites.includes(stock.symbol)
                            };
                        } catch (err) {
                            console.error(`Error fetching data for ${stock.symbol}:`, err);
                            return {
                                name: stock.name,
                                symbol: stock.symbol,
                                price: 0,
                                change: 0,
                                changePercent: 0,
                                isFavorite: favorites.includes(stock.symbol)
                            };
                        }
                    })
                );

                setStocks(stocksData);
            } catch (err) {
                console.error("Error fetching stocks data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStocksData();

        // Refresh data every 5 minutes
        const intervalId = setInterval(fetchStocksData, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, []);

    const toggleFavorite = (symbol: string) => {
        setStocks(stocks.map(stock =>
            stock.symbol === symbol
                ? { ...stock, isFavorite: !stock.isFavorite }
                : stock
        ));

        // Save to localStorage
        const updatedStock = stocks.find(s => s.symbol === symbol);
        if (updatedStock) {
            const savedFavorites = localStorage.getItem('favoriteStocks');
            const favorites = savedFavorites ? JSON.parse(savedFavorites) : [];

            if (updatedStock.isFavorite) {
                // Remove from favorites
                const newFavorites = favorites.filter((s: string) => s !== symbol);
                localStorage.setItem('favoriteStocks', JSON.stringify(newFavorites));
            } else {
                // Add to favorites
                favorites.push(symbol);
                localStorage.setItem('favoriteStocks', JSON.stringify(favorites));
            }
        }
    };

    const filteredStocks = stocks.filter(stock => {
        // Filter by search query
        const matchesSearch =
            stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            stock.symbol.toLowerCase().includes(searchQuery.toLowerCase());

        // Filter by tab
        if (activeTab === "favorites") {
            return matchesSearch && stock.isFavorite;
        }

        return matchesSearch;
    });

    return (
        <div className="flex flex-col h-[calc(100%-120px)]">
            <div className="p-3 border-b border-gray-800">
                <h3 className="text-xs font-semibold mb-2 text-gray-400">WATCHLIST</h3>

                <div className="flex mb-2">
                    <Input
                        placeholder="Search..."
                        className="bg-[#2A2E39] border-none text-xs h-7"
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex border-b border-gray-800">
                    <button
                        className={`text-xs py-1 px-3 ${activeTab === 'all' ? 'text-[#2962FF] border-b-2 border-[#2962FF]' : 'text-gray-400'}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All
                    </button>
                    <button
                        className={`text-xs py-1 px-3 ${activeTab === 'favorites' ? 'text-[#2962FF] border-b-2 border-[#2962FF]' : 'text-gray-400'}`}
                        onClick={() => setActiveTab('favorites')}
                    >
                        Favorites
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-3 space-y-3">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="animate-pulse flex justify-between">
                                <div className="h-4 w-20 bg-gray-700 rounded"></div>
                                <div className="h-4 w-16 bg-gray-700 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-3 space-y-1">
                        {filteredStocks.length === 0 ? (
                            <div className="text-center text-gray-400 text-xs py-4">
                                No stocks found
                            </div>
                        ) : (
                            filteredStocks.map((stock) => (
                                <div
                                    key={stock.symbol}
                                    className={`flex justify-between items-center p-2 rounded text-xs cursor-pointer ${selectedSymbol === stock.symbol ? 'bg-[#2A2E39]' : 'hover:bg-[#1E222D]'
                                        }`}
                                    onClick={() => onSelectSymbol(stock.symbol)}
                                >
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="text-gray-400 hover:text-yellow-400"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(stock.symbol);
                                            }}
                                        >
                                            <Star className="h-3 w-3" fill={stock.isFavorite ? "#F59E0B" : "none"} />
                                        </button>
                                        <div>
                                            <div className="font-medium">{stock.name}</div>
                                            <div className="text-gray-400 text-[10px]">{stock.symbol}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-right">{stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        <div className={`flex items-center justify-end ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {stock.change >= 0 ? <ArrowUp className="h-2 w-2 mr-1" /> : <ArrowDown className="h-2 w-2 mr-1" />}
                                            <span>{stock.changePercent.toFixed(2)}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-gray-800">
                <Button
                    className="w-full bg-[#2A2E39] hover:bg-[#363A45] text-xs h-8 flex items-center justify-center gap-1"
                >
                    <Plus className="h-3 w-3" /> Add Symbol
                </Button>
            </div>
        </div>
    );
} 