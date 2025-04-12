"use client";

import React, { useState, useEffect } from "react";
import { StatsChart } from "../components/stats-chart";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Activity, TrendingUp, Search} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
interface ChartUIProps {
    symbol: string;
    title?: string;
}

export function ChartUI({ symbol, title }: ChartUIProps) {
    const [currentDateTime, setCurrentDateTime] = useState<string>("");

    // Update the date on the client side only
    useEffect(() => {
        setCurrentDateTime(new Date().toLocaleString());

        // Optional: Update the time every minute
        const intervalId = setInterval(() => {
            setCurrentDateTime(new Date().toLocaleString());
        }, 60000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="w-full">
            {title && (
                <h3 className="text-lg font-medium mb-4">{title}</h3>
            )}

            <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <span className="text-sm text-gray-400">Symbol:</span>
                        <span className="ml-2 font-semibold">{symbol}</span>
                    </div>

                    <div className="text-sm text-gray-400">
                        Last updated: {currentDateTime}
                    </div>
                </div>

                <StatsChart symbol={symbol} />

                <div className="mt-4 text-xs text-gray-500">
                    <p>Chart data provided by Yahoo Finance. Traditional signals are generated using EMA crossover strategy.</p>
                    <p className="mt-1">
                        <span className="text-purple-400 font-medium">Gemini AI Feature:</span> Click the "Use Gemini AI" button to enable AI-powered analysis and buy/sell signals using Google's Gemini Flash 1.5 model.
                    </p>
                    <p className="mt-2">This is for informational purposes only and should not be considered financial advice.</p>
                </div>
            </div>
        </div>
    );
} 

// Create a proper page component that uses the ChartUI component
export default function TradePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("TATASTEEL.NS");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  // Use useEffect to handle client-side authentication check
  useEffect(() => {
    setIsClient(true);
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  // Don't render anything until we're on the client and auth is loaded
  if (!isClient || !isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-500" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If no user is authenticated, don't render the page
  if (!user) {
    return null;
  }

  const handleSearch = () => {
    if (searchInput.trim()) {
      setIsSearching(true);
      // Format the search input to match Yahoo Finance symbol format
      let formattedSymbol = searchInput.trim().toUpperCase();
      if (!formattedSymbol.includes("-")) {
        // Check if it's likely a crypto symbol
        if (["BTC", "ETH", "XRP", "LTC", "BCH", "ADA", "DOT", "LINK", "BNB", "USDT"].includes(formattedSymbol)) {
          formattedSymbol = `${formattedSymbol}-USD`;
        } else {
          // Assume it's a stock and add exchange if not present
          if (!formattedSymbol.includes(".")) {
            formattedSymbol = `${formattedSymbol}.NS`;
          }
        }
      }
      setSelectedSymbol(formattedSymbol);
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-purple-500/10 p-2 rounded-lg">
            <TrendingUp className="h-6 w-6 text-purple-500" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Trading Dashboard
          </h1>
        </div>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-[1px] mb-8 shadow-lg">
          <div className="bg-gray-900/95 rounded-xl p-4 flex gap-2">
            <Input
              placeholder="Search stock or crypto"
              className="bg-gray-800/50 text-white placeholder:text-gray-500 border-gray-700 focus:border-purple-500 transition-colors"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-purple-500 hover:bg-purple-600 text-white transition-colors"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <ChartUI symbol={selectedSymbol} title={`${selectedSymbol} Analysis`} />
        </div>
      </div>
    </div>
  );
}