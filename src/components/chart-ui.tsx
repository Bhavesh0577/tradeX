"use client";

import React, { useState, useEffect } from "react";
import { StatsChart } from "./stats-chart";

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