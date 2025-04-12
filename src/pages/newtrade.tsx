"use client";

import React, { useState, useEffect } from "react";
import { StatsChart } from "../components/stats-chart";
import '../app/globals.css'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Activity, BarChart2, Brain, ArrowUpDown, Download, Share2, Sparkles } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";

interface ChartUIProps {
  symbol: string;
  title?: string;
}

function ChartUI({ symbol, title }: ChartUIProps) {
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [isUsingAI, setIsUsingAI] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Update the date on the client side only
  useEffect(() => {
    setCurrentDateTime(new Date().toLocaleString());

    // Optional: Update the time every minute
    const intervalId = setInterval(() => {
      setCurrentDateTime(new Date().toLocaleString());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const handleUseGeminiAI = () => {
    setIsLoading(true);
    // Simulate AI processing
    setTimeout(() => {
      setIsUsingAI(!isUsingAI);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="w-full relative">
      {title && (
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-500" />
          {title}
        </h3>
      )}

      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-[1px] shadow-lg hover:shadow-purple-500/20 transition-shadow duration-300">
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/10 p-2 rounded-lg">
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <span className="text-sm text-gray-400">Symbol</span>
                <h4 className="font-semibold text-lg">{symbol}</h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">
                Last updated: {currentDateTime}
              </span>
            </div>
          </div>

          {/* Chart Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={isUsingAI ? "default" : "outline"}
              size="sm"
              className={`gap-1.5 ${isUsingAI ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'}`}
              onClick={handleUseGeminiAI}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {isUsingAI ? "Using Gemini AI" : "Use Gemini AI"}
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" className="gap-1.5 border-gray-700 text-gray-300 hover:bg-gray-800">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Compare
            </Button>

            <Button variant="outline" size="sm" className="gap-1.5 border-gray-700 text-gray-300 hover:bg-gray-800">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>

            <Button variant="outline" size="sm" className="gap-1.5 border-gray-700 text-gray-300 hover:bg-gray-800">
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-30 rounded-lg" />
            <StatsChart symbol={symbol} />

            {/* AI Indicator */}
            {isUsingAI && (
              <div className="absolute top-2 right-2 bg-purple-500/20 px-2 py-1 rounded-md flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-medium text-purple-300">AI Analysis Active</span>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-2 border-t border-gray-800 pt-4">
            <p className="text-sm text-gray-400">
              Chart data provided by Yahoo Finance. Traditional signals are generated using EMA crossover strategy.
            </p>
            <div className="flex items-start gap-2 bg-purple-500/5 p-3 rounded-lg">
              <div className="bg-purple-500/20 p-1.5 rounded-md mt-0.5">
                <Sparkles className="h-4 w-4 text-purple-400" />
              </div>
              <p className="text-sm">
                <span className="text-purple-400 font-medium">Gemini AI Feature:</span>{" "}
                Click the &quot;Use Gemini AI&quot; button to enable AI-powered analysis and buy/sell signals using Google&apos;s Gemini Flash 1.5 model.
              </p>
            </div>
            <p className="text-xs text-gray-500 italic">
              This is for informational purposes only and should not be considered financial advice.
            </p>
          </div>
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