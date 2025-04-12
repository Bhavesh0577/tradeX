"use client";

import React from "react";

interface TimeframeSelectorProps {
    currentTimeframe: string;
    onTimeframeChange: (timeframe: string) => void;
}

const timeframes = [
    { label: "1m", value: "1m" },
    { label: "5m", value: "5m" },
    { label: "15m", value: "15m" },
    { label: "1H", value: "1H" },
    { label: "4H", value: "4H" },
    { label: "1D", value: "1D" },
    { label: "1W", value: "1W" },
    { label: "1M", value: "1M" },
];

export function TimeframeSelector({ currentTimeframe, onTimeframeChange }: TimeframeSelectorProps) {
    return (
        <div className="flex bg-[#1E222D] rounded-md overflow-hidden">
            {timeframes.map((timeframe) => (
                <button
                    key={timeframe.value}
                    className={`px-3 py-1 text-xs ${currentTimeframe === timeframe.value
                            ? "bg-[#2962FF] text-white"
                            : "text-gray-400 hover:bg-[#2A2E39] hover:text-white"
                        }`}
                    onClick={() => onTimeframeChange(timeframe.value)}
                >
                    {timeframe.label}
                </button>
            ))}
        </div>
    );
} 