"use client";

import React, { useState, useEffect } from "react";
import { TradingViewChart } from "@/components/trading/trading-view-chart";
import { StockInfo } from "@/components/trading/stock-info";
import { WatchList } from "@/components/trading/watch-list";
import { TimeframeSelector } from "@/components/trading/timeframe-selector";
import { ToolBar } from "@/components/trading/tool-bar";
import { MarketIndices } from "@/components/trading/market-indices";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/custom-button";
import { Search, ChevronDown, BarChart2, Settings, Bell, Maximize2, MoreHorizontal } from "lucide-react";

export default function TradingViewPage() {
    const [searchInput, setSearchInput] = useState<string>("");
    const [selectedSymbol, setSelectedSymbol] = useState<string>("TATASTEEL.NS");
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [timeframe, setTimeframe] = useState<string>("1D");

    // Handle search functionality
    const handleSearch = () => {
        if (searchInput.trim()) {
            setSelectedSymbol(searchInput.trim().toUpperCase());
            setSearchInput("");
            setIsSearching(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold">Trading View</h1>
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder="Search symbol..."
                            value={searchInput}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSearch()}
                            className="w-64 pl-8"
                        />
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button onClick={handleSearch} size="sm">
                        Search
                    </Button>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <Settings className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left sidebar - Watchlist */}
                <div className="w-72 border-r overflow-y-auto">
                    <WatchList
                        selectedSymbol={selectedSymbol}
                        onSelectSymbol={(symbol) => setSelectedSymbol(symbol)}
                    />
                </div>

                {/* Main chart area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Stock info bar */}
                    <StockInfo symbol={selectedSymbol} />

                    {/* Chart controls */}
                    <div className="flex items-center justify-between p-2 border-b">
                        <TimeframeSelector
                            currentTimeframe={timeframe}
                            onTimeframeChange={(tf: string) => setTimeframe(tf)}
                        />
                        <ToolBar />
                    </div>

                    {/* Chart */}
                    <div className="flex-1 relative">
                        <TradingViewChart symbol={selectedSymbol} timeframe={timeframe} />
                    </div>

                    {/* Market indices */}
                    <div className="border-t">
                        <MarketIndices />
                    </div>
                </div>
            </div>
        </div>
    );
} 