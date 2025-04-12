"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp } from "lightweight-charts";
import {
  calculateSMA,
  calculateEMA,
  findSignals,
  processChartData,
  getChartOptions,
  getCandlestickOptions,
  getSMAOptions,
  getEMAOptions,
  Marker
} from "./chart-utils";

interface StatsChartProps {
  symbol?: string;
}

interface AIAnalysis {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  analysis: {
    summary: string;
    technicalIndicators: {
      sma5: number;
      sma20: number;
      trend: string;
      momentum: string;
    };
    prediction: string;
  };
  signals: Marker[];
}

export function StatsChart({ symbol = "TATASTEEL.NS" }: StatsChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Local state
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch data for a specific symbol
  const fetchSymbolData = async (symbolToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/finance?symbol=${symbolToFetch}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data for ${symbolToFetch}`);
      }

      const data = await response.json();
      const formattedData = processChartData(data);

      setChartData(formattedData);

      // Update the candlestick series with new data
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(formattedData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(`Failed to fetch data for ${symbolToFetch}. Please try another symbol.`);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch AI predictions
  const fetchAIPredictions = async (symbolToFetch: string) => {
    setAiLoading(true);
    try {
      const response = await fetch(`/api/ai-prediction?symbol=${symbolToFetch}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch AI predictions for ${symbolToFetch}`);
      }

      const data = await response.json();
      setAiAnalysis(data);
    } catch (err) {
      console.error("Error fetching AI predictions:", err);
      setError(`Failed to fetch AI predictions for ${symbolToFetch}.`);
    } finally {
      setAiLoading(false);
    }
  };

  // Function to update markers based on current settings
  const updateMarkers = () => {
    if (!chartData.length || !chartRef.current || !candlestickSeriesRef.current) return;

    // Calculate short and long EMAs for traditional signals
    const shortEMA = calculateEMA(chartData, 3);
    const longEMA = calculateEMA(chartData, 30);

    // Find crossover points for traditional buy/sell signals
    const traditionalSignals = findSignals(shortEMA, longEMA);

    let markers: Marker[] = traditionalSignals;

    // If AI is enabled and we have AI signals, use those instead
    if (useAI && aiAnalysis && aiAnalysis.signals) {
      markers = aiAnalysis.signals;
    }

    // Add buy/sell markers to the candlestick series
    candlestickSeriesRef.current.setMarkers(markers);
  };

  // Effect to add buy/sell signals when chart data changes
  useEffect(() => {
    if (!chartData.length || !chartRef.current) return;
    const chart = chartRef.current;

    // Calculate short and long EMAs
    const shortEMA = calculateEMA(chartData, 3);
    const longEMA = calculateEMA(chartData, 30);

    // Add EMA series to the chart
    const shortEMASeries = chart.addLineSeries({
      color: "#00ff00",
      lineWidth: 2 as any // Type assertion to fix the linter error
    });
    const longEMASeries = chart.addLineSeries({
      color: "#ff0000",
      lineWidth: 2 as any // Type assertion to fix the linter error
    });

    shortEMASeries.setData(shortEMA);
    longEMASeries.setData(longEMA);

    // Update markers based on current settings
    updateMarkers();

    return () => {
      chart.removeSeries(shortEMASeries);
      chart.removeSeries(longEMASeries);
    };
  }, [chartData]);

  // Effect to update markers when useAI changes
  useEffect(() => {
    if (useAI && !aiAnalysis) {
      // Fetch AI predictions if they haven't been fetched yet
      fetchAIPredictions(symbol);
    } else {
      // Update markers based on current settings
      updateMarkers();
    }
  }, [useAI, aiAnalysis]);

  // Chart creation (runs once on mount)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart with a dark theme
    const chart = createChart(
      chartContainerRef.current,
      getChartOptions(chartContainerRef.current.offsetWidth)
    );
    chartRef.current = chart;

    // Add the candlestick series
    const candlestickSeries = chart.addCandlestickSeries(getCandlestickOptions());
    candlestickSeriesRef.current = candlestickSeries;

    // Initial data fetch
    fetchSymbolData(symbol);

    // Handle responsive resizing
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.offsetWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current?.remove();
    };
  }, []);

  // Effect to refetch data when symbol changes
  useEffect(() => {
    if (chartRef.current && candlestickSeriesRef.current) {
      fetchSymbolData(symbol);
      // Reset AI analysis when symbol changes
      setAiAnalysis(null);
      if (useAI) {
        fetchAIPredictions(symbol);
      }
    }
  }, [symbol]);

  // Effect to add or remove indicators when toggles change or when data is available
  useEffect(() => {
    if (!chartData.length || !chartRef.current) return;
    const chart = chartRef.current;

    // Toggle SMA indicator
    if (showSMA) {
      if (!smaSeriesRef.current) {
        const smaOptions = getSMAOptions();
        const smaSeries = chart.addLineSeries({
          color: smaOptions.color,
          lineWidth: smaOptions.lineWidth as any // Type assertion to fix the linter error
        });
        smaSeriesRef.current = smaSeries;
      }
      const smaData = calculateSMA(chartData, 14);
      smaSeriesRef.current?.setData(smaData);
    } else {
      if (smaSeriesRef.current) {
        chart.removeSeries(smaSeriesRef.current);
        smaSeriesRef.current = null;
      }
    }

    // Toggle EMA indicator
    if (showEMA) {
      if (!emaSeriesRef.current) {
        const emaOptions = getEMAOptions();
        const emaSeries = chart.addLineSeries({
          color: emaOptions.color,
          lineWidth: emaOptions.lineWidth as any // Type assertion to fix the linter error
        });
        emaSeriesRef.current = emaSeries;
      }
      const emaData = calculateEMA(chartData, 14);
      emaSeriesRef.current?.setData(emaData);
    } else {
      if (emaSeriesRef.current) {
        chart.removeSeries(emaSeriesRef.current);
        emaSeriesRef.current = null;
      }
    }
  }, [chartData, showSMA, showEMA]);

  return (
    <div>
      <div className="flex justify-center items-center gap-4 mb-4">
        <button
          onClick={() => setShowSMA((prev) => !prev)}
          className="px-3 py-1 bg-gray-700 rounded text-white hover:bg-gray-600"
        >
          {showSMA ? "Hide SMA" : "Show SMA"}
        </button>
        <button
          onClick={() => setShowEMA((prev) => !prev)}
          className="px-3 py-1 bg-gray-700 rounded text-white hover:bg-gray-600"
        >
          {showEMA ? "Hide EMA" : "Show EMA"}
        </button>
        <button
          onClick={() => setUseAI((prev) => !prev)}
          className={`px-3 py-1 rounded text-white ${useAI
            ? "bg-purple-600 hover:bg-purple-700"
            : "bg-gray-700 hover:bg-gray-600"
            }`}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading Gemini AI...
            </span>
          ) : (
            useAI ? "Using Gemini AI" : "Use Gemini AI"
          )}
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <div className="flex justify-center items-center h-[400px] text-red-500">
          <p>{error}</p>
        </div>
      )}

      <div
        ref={chartContainerRef}
        style={{
          position: "relative",
          display: loading || error ? "none" : "block"
        }}
      />

      {useAI && aiAnalysis && (
        <div className="mt-4 p-4 bg-purple-900/30 border border-purple-500/30 rounded-md">
          <h4 className="text-sm font-semibold text-purple-300 mb-2">Gemini AI Analysis for {aiAnalysis.symbol}</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-xs font-medium text-purple-200 mb-1">Market Summary</h5>
              <p className="text-xs text-gray-300">{aiAnalysis.analysis.summary}</p>

              <div className="mt-3">
                <h5 className="text-xs font-medium text-purple-200 mb-1">AI Prediction</h5>
                <p className="text-xs text-gray-300">{aiAnalysis.analysis.prediction}</p>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-medium text-purple-200 mb-1">Technical Indicators</h5>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                <div>
                  <span className="text-gray-400">SMA (5):</span> {aiAnalysis.analysis.technicalIndicators.sma5.toFixed(2)}
                </div>
                <div>
                  <span className="text-gray-400">SMA (20):</span> {aiAnalysis.analysis.technicalIndicators.sma20.toFixed(2)}
                </div>
                <div>
                  <span className="text-gray-400">Trend:</span>
                  <span className={aiAnalysis.analysis.technicalIndicators.trend === "Bullish" ? "text-green-400" : "text-red-400"}>
                    {aiAnalysis.analysis.technicalIndicators.trend}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Momentum:</span>
                  <span className={aiAnalysis.analysis.technicalIndicators.momentum === "Positive" ? "text-green-400" : "text-red-400"}>
                    {aiAnalysis.analysis.technicalIndicators.momentum}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center">
                <span className="inline-block w-3 h-3 bg-[#00BFFF] rounded-full mr-1"></span>
                <span className="text-xs text-gray-300 mr-3">Blue arrows: AI buy signals</span>
                <span className="inline-block w-3 h-3 bg-[#FF1493] rounded-full mr-1"></span>
                <span className="text-xs text-gray-300">Pink arrows: AI sell signals</span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-400 italic">
            Powered by Google Gemini Flash 1.5 AI model
          </div>
        </div>
      )}
    </div>
  );
}

export default StatsChart;
