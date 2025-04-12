"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, DeepPartial, HistogramStyleOptions, SeriesOptionsCommon, CandlestickData, Time } from "lightweight-charts";
import { calculateSMA, calculateEMA, findSignals, processChartData } from "../chart-utils";

// Extend the CandlestickData interface to include volume
interface ExtendedCandlestickData extends CandlestickData<Time> {
    volume?: number;
}

// Extend the HistogramStyleOptions interface to include scaleMargins
interface ExtendedHistogramStyleOptions extends DeepPartial<HistogramStyleOptions & SeriesOptionsCommon> {
    scaleMargins?: {
        top: number;
        bottom: number;
    };
}

interface TradingViewChartProps {
    symbol: string;
    timeframe: string;
}

export function TradingViewChart({ symbol, timeframe }: TradingViewChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Function to fetch data for a specific symbol
    const fetchSymbolData = async (symbolToFetch: string, interval: string = "1d") => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/finance?symbol=${symbolToFetch}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch data for ${symbolToFetch}`);
            }

            const data = await response.json();
            const formattedData = processChartData(data);

            // Update the candlestick series with new data
            if (candlestickSeriesRef.current) {
                candlestickSeriesRef.current.setData(formattedData);
            }

            // Update volume series
            if (volumeSeriesRef.current && formattedData.length > 0) {
                const volumeData = formattedData.map((item: ExtendedCandlestickData) => ({
                    time: item.time,
                    value: item.volume || 0,
                    color: item.close >= item.open ? 'rgba(0, 150, 136, 0.5)' : 'rgba(255, 82, 82, 0.5)'
                }));
                volumeSeriesRef.current.setData(volumeData);
            }

            // Update SMA series
            if (smaSeriesRef.current) {
                const smaData = calculateSMA(formattedData, 20);
                smaSeriesRef.current.setData(smaData);
            }

            // Update EMA series
            if (emaSeriesRef.current) {
                const emaData = calculateEMA(formattedData, 50);
                emaSeriesRef.current.setData(emaData);
            }

            // Add buy/sell markers
            if (candlestickSeriesRef.current) {
                const shortEMA = calculateEMA(formattedData, 9);
                const longEMA = calculateEMA(formattedData, 21);
                const markers = findSignals(shortEMA, longEMA);
                candlestickSeriesRef.current.setMarkers(markers);
            }

        } catch (err) {
            console.error("Error fetching data:", err);
            setError(`Failed to fetch data for ${symbolToFetch}. Please try another symbol.`);
        } finally {
            setLoading(false);
        }
    };

    // Chart creation (runs once on mount)
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Create the chart with a dark theme
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.offsetWidth,
            height: chartContainerRef.current.offsetHeight,
            layout: {
                background: { color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#1e222d' },
                horzLines: { color: '#1e222d' },
            },
            crosshair: { mode: 1 },
            rightPriceScale: {
                borderColor: '#1e222d',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.3,
                },
            },
            timeScale: {
                borderColor: '#1e222d',
                timeVisible: true,
                secondsVisible: false,
            },
        });
        chartRef.current = chart;

        // Add the candlestick series
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        candlestickSeriesRef.current = candlestickSeries;

        // Add volume series
        const volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        } as ExtendedHistogramStyleOptions);
        volumeSeriesRef.current = volumeSeries;

        // Add SMA series
        const smaSeries = chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 2 as any,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        smaSeriesRef.current = smaSeries;

        // Add EMA series
        const emaSeries = chart.addLineSeries({
            color: '#FF6D00',
            lineWidth: 2 as any,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        emaSeriesRef.current = emaSeries;

        // Initial data fetch
        fetchSymbolData(symbol);

        // Handle responsive resizing
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.offsetWidth,
                    height: chartContainerRef.current.offsetHeight
                });
            }
        };
        window.addEventListener("resize", handleResize);

        // Cleanup on component unmount
        return () => {
            window.removeEventListener("resize", handleResize);
            chartRef.current?.remove();
        };
    }, []);

    // Effect to refetch data when symbol or timeframe changes
    useEffect(() => {
        if (chartRef.current && candlestickSeriesRef.current) {
            // Convert timeframe to interval for API
            let interval = "1d";
            switch (timeframe) {
                case "1m": interval = "1m"; break;
                case "5m": interval = "5m"; break;
                case "15m": interval = "15m"; break;
                case "1H": interval = "60m"; break;
                case "4H": interval = "4h"; break;
                case "1D": interval = "1d"; break;
                case "1W": interval = "1wk"; break;
                case "1M": interval = "1mo"; break;
                default: interval = "1d";
            }

            fetchSymbolData(symbol, interval);
        }
    }, [symbol, timeframe]);

    return (
        <div className="w-full h-full relative">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#131722]/80 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#131722]/80 z-10">
                    <div className="bg-red-500/20 border border-red-500 rounded-md p-4 max-w-md">
                        <p className="text-red-500">{error}</p>
                    </div>
                </div>
            )}

            <div
                ref={chartContainerRef}
                className="w-full h-full"
            />

            <div className="absolute bottom-4 right-4 flex gap-2 bg-[#131722]/80 p-2 rounded text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-[#2962FF]"></div>
                    <span>SMA(20)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-[#FF6D00]"></div>
                    <span>EMA(50)</span>
                </div>
            </div>
        </div>
    );
} 