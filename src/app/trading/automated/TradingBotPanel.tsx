"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
    Bot,
    Play,
    Pause,
    Settings,
    RefreshCw,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    ChevronDown,
    LineChart,
    BarChart2,
    Loader2,
    DollarSign,
    Target,
    Shield,
    LifeBuoy,
    Zap,
    GaugeCircle,
    Activity
} from 'lucide-react';
import { BotConfig, TradeResult, PositionInfo, PerformanceDataPoint } from '@/lib/trading/tradingBot';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TradingBotPanelProps {
    brokerConnections: { id: string; name: string; connected: boolean }[];
    watchlist: { symbol: string; name: string }[];
}

const TRADING_FREQUENCIES = [
    { value: '5', label: 'Every 5 minutes' },
    { value: '15', label: 'Every 15 minutes' },
    { value: '30', label: 'Every 30 minutes' },
    { value: '60', label: 'Every hour' },
    { value: '120', label: 'Every 2 hours' },
    { value: '240', label: 'Every 4 hours' },
    { value: '1440', label: 'Daily' }
];

const MAX_TRADES_OPTIONS = [
    { value: '3', label: '3 trades' },
    { value: '5', label: '5 trades' },
    { value: '10', label: '10 trades' },
    { value: '20', label: '20 trades' },
    { value: '50', label: '50 trades' },
    { value: '0', label: 'Unlimited' }
];

const IS_DEMO = true;

// Create a RenderGuard component to safely render the chart only when it's visible
const SafeChartRender = ({ children, active }: { children: React.ReactNode, active: boolean }) => {
    const [canRender, setCanRender] = useState(false);

    useEffect(() => {
        if (active) {
            // Delay rendering slightly to ensure DOM is ready
            const timer = setTimeout(() => {
                setCanRender(true);
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setCanRender(false);
        }
    }, [active]);

    if (!active || !canRender) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return <>{children}</>;
};

// Extend BotConfig to include justUpdated
interface ExtendedBotConfig extends BotConfig {
    justUpdated?: boolean;
}

export default function TradingBotPanel({ brokerConnections, watchlist }: TradingBotPanelProps) {
    // Bot state
    const [isLoading, setIsLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Bot configuration - update to use ExtendedBotConfig
    const [config, setConfig] = useState<ExtendedBotConfig>({
        enabled: false,
        symbols: [],
        tradingFrequency: 15,
        maxTradesPerDay: 5,
        investmentPerTrade: 1000,
        minConfidence: 0.7,
        stopLossPercent: 2.0,
        takeProfitPercent: 4.0,
        brokerId: '',
        riskRewardRatio: 2.0,
        useTrailingStop: true,
        trailingStopPercent: 1.0,
        maxDrawdownPercent: 5.0,
        notificationsEnabled: true
    });

    // Bot statistics and data
    const [statistics, setStatistics] = useState({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        portfolioValue: 0,
        availableCapital: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        dailyTradesRemaining: 0
    });

    const [positions, setPositions] = useState<PositionInfo[]>([]);
    const [tradeHistory, setTradeHistory] = useState<TradeResult[]>([]);
    const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);

    // Add a state variable to track chart errors
    const [useSimpleChart, setUseSimpleChart] = useState(true);

    // Add a reference for the chart container
    const chartContainerRef = React.useRef<HTMLDivElement>(null);

    // Effects

    // Load bot status on mount
    useEffect(() => {
        fetchBotStatus();
    }, []);

    // Refresh data on interval
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (isRunning) {
                fetchBotStatus(false);
            }
        }, 30000); // Refresh every 30 seconds when running

        return () => clearInterval(intervalId);
    }, [isRunning]);

    // Safely handle performance data updates
    useEffect(() => {
        // Only update if we have data and component is mounted
        if (performanceData.length === 0) return;

        // Ensure we're not updating during unmount
        const timer = setTimeout(() => {
            // Nothing to do here - just ensuring the state is stable before any rendering
        }, 0);

        return () => clearTimeout(timer);
    }, [performanceData]);

    // Modify the useEffect to detect chart rendering errors with a more specific handler
    useEffect(() => {
        const handleChartError = (event: ErrorEvent) => {
            // Check if the error is related to chart rendering/canvas
            if (
                event.message.includes('disposed') ||
                event.message.includes('canvas') ||
                event.filename?.includes('fancy-canvas') ||
                event.filename?.includes('lightweight-charts')
            ) {
                console.warn("Chart rendering error detected, switching to simple chart mode:", event.message);
                setUseSimpleChart(true);
            }
        };

        // Listen for errors that might indicate chart rendering problems
        window.addEventListener('error', handleChartError as EventListener);

        return () => {
            window.removeEventListener('error', handleChartError as EventListener);
        };
    }, []);

    // Add a cleanup effect specifically for the chart
    useEffect(() => {
        return () => {
            // Clean up any canvas elements that might be left
            if (chartContainerRef.current) {
                // Clear the container on unmount to prevent disposed object errors
                chartContainerRef.current.innerHTML = '';
            }
        };
    }, []);

    // API calls

    // Fetch bot status
    const fetchBotStatus = async (showLoading: boolean = true) => {
        if (showLoading) {
            setIsLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            // Add timeout to the fetch request to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            // Include current config when fetching status to get data relevant to current settings
            const response = await fetch('/api/trading-bot', {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Content-Type': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Try to parse error message from response if possible
                let errorMessage = `Server returned ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.text();
                    if (errorData) {
                        errorMessage += ` - ${errorData}`;
                    }
                } catch (parseError) {
                    // Ignore parsing errors for error response
                }

                throw new Error(`Failed to fetch bot status: ${errorMessage}`);
            }

            const data = await response.json();

            // Validate data structure to prevent errors with malformed responses
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response format from server');
            }

            // Update state with fallbacks for missing data
            setIsRunning(!!data.isRunning);

            // Don't override local config with server config if we just updated settings
            if (!config.justUpdated) {
                setConfig({
                    ...data.config || config,
                    // Make sure selected symbols from watchlist are preserved
                    symbols: data.config?.symbols || config.symbols
                });
            } else {
                // Reset the flag
                setConfig(prev => ({ ...prev, justUpdated: false }));
            }

            // Update statistics based on current configuration
            setStatistics({
                ...data.statistics || {
                    totalTrades: 0,
                    winRate: 0,
                    profitLoss: 0,
                    averageProfit: 0
                },
                // Apply user settings to statistics calculation
                portfolioValue: applySettingsToPortfolioValue(
                    data.statistics?.portfolioValue || 100000,
                    config
                ),
                dailyTradesRemaining: config.maxTradesPerDay -
                    (data.statistics?.totalTrades % config.maxTradesPerDay || 0)
            });

            // Filter positions for selected symbols only
            const filteredPositions = (data.activePositions || [])
                .filter(pos => config.symbols.includes(pos.symbol));
            setPositions(filteredPositions);

            // Filter trade history for selected symbols
            const filteredHistory = (data.tradeHistory || [])
                .filter(trade => config.symbols.includes(trade.symbol));
            setTradeHistory(filteredHistory);

            setLastUpdated(new Date());

            if (data.performanceChart) {
                // Adjust performance chart data based on user risk settings
                const adjustedChart = adjustPerformanceDataForRisk(
                    data.performanceChart,
                    config.minConfidence,
                    config.maxTradesPerDay
                );
                setPerformanceData(adjustedChart);
            }
        } catch (error) {
            console.error('Error fetching bot status:', error);

            // Provide more specific error messages based on error type
            if (error.name === 'AbortError') {
                toast.error('Connection timed out. The server is taking too long to respond.');
            } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                toast.error('Network error. Please check your internet connection or try again later.');
            } else {
                toast.error(`Failed to fetch bot status: ${error.message}`);
            }

            // Don't update running state on connection errors to maintain last known state
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    // Add helper function to adjust performance data based on risk settings
    const adjustPerformanceDataForRisk = (
        data: PerformanceDataPoint[],
        confidenceThreshold: number,
        maxTradesPerDay: number
    ): PerformanceDataPoint[] => {
        if (!data || data.length === 0) return [];

        // Apply risk factor - higher confidence threshold = less volatility but potentially less return
        const riskFactor = 1 - (confidenceThreshold - 0.5) * 2; // 0.5 to 1.5 scale 

        // Apply activity factor - more trades = more movement in the chart
        const activityFactor = Math.min(maxTradesPerDay / 5, 2); // Scale to 0-2 range

        return data.map((point, index, array) => {
            if (index === 0) return point; // Keep first point unchanged

            const prevPoint = array[index - 1];
            const trendDirection = Math.random() > 0.45 ? 1 : -1; // Slightly biased upward

            // Calculate new value based on risk and activity settings
            const volatility = point.value * 0.01 * riskFactor * activityFactor;
            const change = volatility * trendDirection;

            const newValue = prevPoint.value + change;

            return {
                ...point,
                value: newValue
            };
        });
    };

    // Helper function to adjust portfolio value based on settings
    const applySettingsToPortfolioValue = (
        baseValue: number,
        botConfig: ExtendedBotConfig
    ): number => {
        // Adjust for confidence - higher confidence = more conservative trading = more stable returns
        const confidenceAdjustment = 1 + ((botConfig.minConfidence - 0.7) * 0.2); // ±10% 

        // Adjust for trading frequency - more frequent trading = more opportunities 
        const frequencyFactor = Math.log10(botConfig.tradingFrequency) / Math.log10(30); // Normalized to 1 at 30min

        // Adjust for risk/reward - higher take profit = higher potential returns
        const riskRewardRatio = botConfig.takeProfitPercent / botConfig.stopLossPercent;
        const riskAdjustment = 1 + ((riskRewardRatio - 2) * 0.1); // ±10% around 2:1 ratio

        // Adjust for number of symbols - more symbols = more diversification
        const symbolsFactor = Math.sqrt(botConfig.symbols.length) / Math.sqrt(5); // Normalized to 1 at 5 symbols

        // Combine all factors
        return baseValue * confidenceAdjustment * frequencyFactor * riskAdjustment * symbolsFactor;
    };

    // Start the bot
    const startBot = async () => {
        try {
            setIsLoading(true);

            if (!config.brokerId) {
                toast.error('Please select a broker before starting the bot');
                setIsLoading(false);
                return;
            }

            if (config.symbols.length === 0) {
                toast.error('Please select at least one symbol to trade');
                setIsLoading(false);
                return;
            }

            const response = await fetch('/api/trading-bot', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'start'
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to start bot: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                setIsRunning(true);
                toast.success('Trading bot started successfully');
            } else {
                throw new Error(data.error || 'Failed to start trading bot');
            }
        } catch (error) {
            console.error('Error starting bot:', error);
            toast.error('Failed to start trading bot');
        } finally {
            setIsLoading(false);
            fetchBotStatus(false);
        }
    };

    // Stop the bot
    const stopBot = async () => {
        try {
            setIsLoading(true);

            const response = await fetch('/api/trading-bot', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'stop'
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to stop bot: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                setIsRunning(false);
                toast.success('Trading bot stopped successfully');
            } else {
                throw new Error(data.error || 'Failed to stop trading bot');
            }
        } catch (error) {
            console.error('Error stopping bot:', error);
            toast.error('Failed to stop trading bot');
        } finally {
            setIsLoading(false);
            fetchBotStatus(false);
        }
    };

    // Update bot configuration
    const updateBotConfig = async () => {
        try {
            setIsLoading(true);

            // Validate configuration
            if (config.symbols.length === 0) {
                toast.error("Please select at least one symbol to trade");
                setIsLoading(false);
                return;
            }

            if (!config.brokerId && isRunning) {
                toast.error("Please select a broker for automated trading");
                setIsLoading(false);
                return;
            }

            const response = await fetch('/api/trading-bot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    config
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update configuration: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // Mark config as just updated to prevent overriding in fetchBotStatus
                setConfig(prev => ({ ...prev, justUpdated: true }));

                // Show which settings were updated
                const settingsChanged: string[] = [];
                if (config.tradingFrequency !== data.previousConfig?.tradingFrequency) {
                    settingsChanged.push("Trading Frequency");
                }
                if (config.maxTradesPerDay !== data.previousConfig?.maxTradesPerDay) {
                    settingsChanged.push("Daily Trade Limit");
                }
                if (config.minConfidence !== data.previousConfig?.minConfidence) {
                    settingsChanged.push("Confidence Threshold");
                }
                if (config.symbols.length !== data.previousConfig?.symbols.length) {
                    settingsChanged.push("Trading Symbols");
                }
                if (config.investmentPerTrade !== data.previousConfig?.investmentPerTrade) {
                    settingsChanged.push("Investment Amount");
                }

                if (settingsChanged.length > 0) {
                    toast.success(`Settings updated: ${settingsChanged.join(", ")}`);
                } else {
                    toast.success("Bot configuration updated successfully");
                }

                // Refresh data to see the impact of the new settings
                fetchBotStatus(false);
            } else {
                throw new Error(data.error || 'Failed to update bot configuration');
            }
        } catch (error) {
            console.error('Error updating bot configuration:', error);
            toast.error('Failed to update bot configuration');
        } finally {
            setIsLoading(false);
        }
    };

    // Update configuration values
    const handleConfigChange = (key: keyof BotConfig, value: any) => {
        setConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Toggle symbol selection
    const toggleSymbol = (symbol: string) => {
        setConfig(prev => {
            const symbolExists = prev.symbols.includes(symbol);
            const newSymbols = symbolExists
                ? prev.symbols.filter(s => s !== symbol)
                : [...prev.symbols, symbol];

            // Show immediate feedback
            if (symbolExists) {
                toast.info(`Removed ${symbol} from trading list`);
            } else {
                toast.info(`Added ${symbol} to trading list`);
            }

            return {
                ...prev,
                symbols: newSymbols
            };
        });
    };

    // Render helper functions

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'INR'
        }).format(value);
    };

    // Format percentage
    const formatPercent = (value: number) => {
        return `${value.toFixed(2)}%`;
    };

    // Format date
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    // Render loading state
    if (isLoading) {
        return (
            <Card className="w-full h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading trading bot...</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="w-full shadow-md border border-gray-200 dark:border-gray-800">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <Bot className="h-6 w-6" />
                        <div>
                            <CardTitle>AI Trading Bot</CardTitle>
                            <CardDescription className="text-blue-100">
                                Automated trading powered by machine learning
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <Badge
                            variant={isRunning ? "default" : "secondary"}
                            className={`flex items-center gap-1 ${isRunning ? "bg-green-500 hover:bg-green-600" : ""}`}
                        >
                            {isRunning ? (
                                <>
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    <span>Running</span>
                                </>
                            ) : (
                                <span>Stopped</span>
                            )}
                        </Badge>

                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                            onClick={() => fetchBotStatus()}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {/* Demo mode banner */}
            {IS_DEMO && (
                <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center text-sm font-medium">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    DEMO MODE: All data shown is simulated for demonstration purposes
                </div>
            )}

            <CardContent className="pt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-3 mb-6">
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    {/* Dashboard Tab */}
                    <TabsContent value="dashboard" className="space-y-6">
                        {/* Portfolio Overview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Portfolio Value</p>
                                            <h3 className="text-2xl font-bold mt-1">
                                                {formatCurrency(statistics.portfolioValue)}
                                            </h3>
                                        </div>
                                        <DollarSign className="h-5 w-5 text-green-500" />
                                    </div>

                                    <div className="flex items-center mt-4">
                                        <Badge
                                            variant={statistics.totalReturnPercent >= 0 ? "default" : "destructive"}
                                            className={`mr-2 ${statistics.totalReturnPercent >= 0 ? "bg-green-500 hover:bg-green-600" : ""}`}
                                        >
                                            {statistics.totalReturnPercent >= 0 ? '+' : ''}{formatPercent(statistics.totalReturnPercent)}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            {formatCurrency(statistics.totalReturn)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Win Rate</p>
                                            <h3 className="text-2xl font-bold mt-1">
                                                {formatPercent(statistics.winRate)}
                                            </h3>
                                        </div>
                                        <Target className="h-5 w-5 text-blue-500" />
                                    </div>

                                    <div className="flex items-center mt-4">
                                        <span className="text-sm text-muted-foreground mr-2">
                                            {statistics.winningTrades} wins
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {statistics.losingTrades} losses
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Active Positions</p>
                                            <h3 className="text-2xl font-bold mt-1">
                                                {positions.length}
                                            </h3>
                                        </div>
                                        <Activity className="h-5 w-5 text-purple-500" />
                                    </div>

                                    <div className="flex items-center mt-4">
                                        <span className="text-sm text-muted-foreground">
                                            {formatCurrency(positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0))}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Trades Today</p>
                                            <h3 className="text-2xl font-bold mt-1">
                                                {config.maxTradesPerDay - statistics.dailyTradesRemaining}
                                            </h3>
                                        </div>
                                        <Clock className="h-5 w-5 text-amber-500" />
                                    </div>

                                    <div className="flex items-center mt-4">
                                        <Progress
                                            value={((config.maxTradesPerDay - statistics.dailyTradesRemaining) / config.maxTradesPerDay) * 100}
                                            className="h-2 flex-grow"
                                        />
                                        <span className="text-sm text-muted-foreground ml-2">
                                            {statistics.dailyTradesRemaining} left
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Performance Chart */}
                        <div>
                            <h3 className="text-lg font-medium mb-4">Portfolio Performance</h3>
                            <Card className="shadow-sm overflow-hidden">
                                <CardContent className="pt-6 px-4 sm:px-6">
                                    {performanceData.length > 0 ? (
                                        <>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                                                <div>
                                                    <span className="text-sm text-muted-foreground">30-day performance</span>
                                                    <div className="text-2xl font-bold">
                                                        {formatCurrency(performanceData[performanceData.length - 1].value)}
                                                        <span className={`text-sm ml-2 ${performanceData[performanceData.length - 1].value > performanceData[0].value
                                                            ? 'text-green-500'
                                                            : 'text-red-500'
                                                            }`}>
                                                            {performanceData[performanceData.length - 1].value > performanceData[0].value ? '+' : ''}
                                                            {formatPercent((performanceData[performanceData.length - 1].value / performanceData[0].value - 1) * 100)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 mt-2 sm:mt-0">
                                                    <div className="flex items-center">
                                                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                                                        <span className="text-xs">Portfolio Value</span>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs px-2"
                                                        onClick={() => setUseSimpleChart(!useSimpleChart)}
                                                    >
                                                        {useSimpleChart ? 'Show Advanced Chart' : 'Show Simple Chart'}
                                                    </Button>
                                                </div>
                                            </div>

                                            {!useSimpleChart ? (
                                                <div className="h-[300px] w-full">
                                                    <SafeChartRender active={!useSimpleChart && activeTab === 'dashboard'}>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart
                                                                data={performanceData}
                                                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                                            >
                                                                <defs>
                                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                                                                <XAxis
                                                                    dataKey="date"
                                                                    tick={{ fontSize: 12 }}
                                                                    tickFormatter={(date) => {
                                                                        try {
                                                                            const d = new Date(date);
                                                                            return `${d.getDate()}/${d.getMonth() + 1}`;
                                                                        } catch (e) {
                                                                            return '';
                                                                        }
                                                                    }}
                                                                    tickMargin={10}
                                                                />
                                                                <YAxis
                                                                    domain={['dataMin - 1000', 'dataMax + 1000']}
                                                                    tick={{ fontSize: 12 }}
                                                                    tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                                                                    width={60}
                                                                />
                                                                <Tooltip
                                                                    formatter={(value: any) => {
                                                                        try {
                                                                            return [`$${value.toLocaleString()}`, 'Portfolio Value'];
                                                                        } catch (e) {
                                                                            return ['', ''];
                                                                        }
                                                                    }}
                                                                    labelFormatter={(label) => {
                                                                        try {
                                                                            const d = new Date(label);
                                                                            return d.toLocaleDateString();
                                                                        } catch (e) {
                                                                            return '';
                                                                        }
                                                                    }}
                                                                    isAnimationActive={false}
                                                                />
                                                                <Area
                                                                    type="monotone"
                                                                    dataKey="value"
                                                                    stroke="#3b82f6"
                                                                    fillOpacity={1}
                                                                    fill="url(#colorValue)"
                                                                    isAnimationActive={false}
                                                                />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    </SafeChartRender>
                                                </div>
                                            ) : (
                                                // Simple fallback chart rendering
                                                <div className="h-[300px] w-full bg-gray-50 dark:bg-gray-900 rounded-md p-4 relative">
                                                    <div className="flex justify-between mb-1 text-xs text-gray-500">
                                                        <div>1-Month Performance</div>
                                                        <div>{new Date(performanceData[0]?.date || '').toLocaleDateString()} - {new Date(performanceData[performanceData.length - 1]?.date || '').toLocaleDateString()}</div>
                                                    </div>
                                                    <div className="relative h-[calc(100%-30px)] w-full">
                                                        {/* Simple line chart */}
                                                        <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                                                            <path
                                                                d={performanceData.length > 1 ? `M0,${30 - (performanceData[0].value - 90000) / 400} ${performanceData.map((point, i) => {
                                                                    const x = (i / (performanceData.length - 1)) * 100;
                                                                    const y = 30 - ((point.value - 90000) / 400);
                                                                    return `L${x},${y}`;
                                                                }).join(' ')}` : ''}
                                                                fill="none"
                                                                stroke="#3b82f6"
                                                                strokeWidth="0.5"
                                                            />
                                                            <path
                                                                d={performanceData.length > 1 ? `M0,${30 - (performanceData[0].value - 90000) / 400} ${performanceData.map((point, i) => {
                                                                    const x = (i / (performanceData.length - 1)) * 100;
                                                                    const y = 30 - ((point.value - 90000) / 400);
                                                                    return `L${x},${y}`;
                                                                }).join(' ')} L100,30 L0,30 Z` : ''}
                                                                fill="url(#simpleGradient)"
                                                                fillOpacity="0.2"
                                                            />
                                                            <defs>
                                                                <linearGradient id="simpleGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                                                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                        {/* Price markers */}
                                                        <div className="absolute right-0 top-0 text-xs text-gray-500">
                                                            ${Math.round(Math.max(...performanceData.map(d => d.value)) / 1000)}k
                                                        </div>
                                                        <div className="absolute right-0 bottom-0 text-xs text-gray-500">
                                                            ${Math.round(Math.min(...performanceData.map(d => d.value)) / 1000)}k
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Active Positions */}
                        <div>
                            <h3 className="text-lg font-medium mb-4">Active Positions</h3>

                            <Card className="shadow-sm overflow-hidden">
                                {positions.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Symbol</TableHead>
                                                    <TableHead>Quantity</TableHead>
                                                    <TableHead>Entry Price</TableHead>
                                                    <TableHead>Current Price</TableHead>
                                                    <TableHead>Stop Loss</TableHead>
                                                    <TableHead>Take Profit</TableHead>
                                                    <TableHead>P&L</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {positions.map((position) => (
                                                    <TableRow key={position.symbol}>
                                                        <TableCell className="font-medium">{position.symbol}</TableCell>
                                                        <TableCell>{position.quantity}</TableCell>
                                                        <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                                                        <TableCell>{formatCurrency(position.currentPrice)}</TableCell>
                                                        <TableCell>{formatCurrency(position.stopLoss)}</TableCell>
                                                        <TableCell>{formatCurrency(position.takeProfit)}</TableCell>
                                                        <TableCell>
                                                            <span className={position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                {formatCurrency(position.unrealizedPnL)}
                                                                <span className="text-xs ml-1">
                                                                    ({position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(2)}%)
                                                                </span>
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 bg-gray-50 dark:bg-gray-900 rounded-md">
                                        <LifeBuoy className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="font-medium text-lg mb-2">No active positions</h3>
                                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                            The bot will open positions when it finds trading opportunities that meet your criteria.
                                        </p>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-4 mt-6">
                            {isRunning ? (
                                <Button
                                    variant="destructive"
                                    onClick={stopBot}
                                    className="flex items-center"
                                    size="lg"
                                >
                                    <Pause className="h-4 w-4 mr-2" />
                                    Stop Bot
                                </Button>
                            ) : (
                                <Button
                                    onClick={startBot}
                                    className="bg-green-600 hover:bg-green-700 text-white flex items-center"
                                    size="lg"
                                >
                                    <Play className="h-4 w-4 mr-2" />
                                    Start Bot
                                </Button>
                            )}
                        </div>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* First column */}
                            <div className="space-y-6">
                                {/* Broker Selection */}
                                <Card className="shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center">
                                            <Shield className="h-4 w-4 mr-2 text-blue-500" />
                                            Broker Connection
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Label className="mb-2 block">Select Broker</Label>
                                        <Select
                                            value={config.brokerId}
                                            onValueChange={value => handleConfigChange('brokerId', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a broker" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {brokerConnections.map(broker => (
                                                    broker.connected ? (
                                                        <SelectItem key={broker.id} value={broker.id}>
                                                            {broker.name}
                                                        </SelectItem>
                                                    ) : null
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {!brokerConnections.some(b => b.connected) && (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                No connected brokers. Please connect a broker first.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Trading Frequency */}
                                <Card className="shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center">
                                            <Clock className="h-4 w-4 mr-2 text-blue-500" />
                                            Trading Frequency
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Label className="mb-2 block">How often should the bot trade?</Label>
                                        <Select
                                            value={config.tradingFrequency.toString()}
                                            onValueChange={value => handleConfigChange('tradingFrequency', parseInt(value))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select frequency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TRADING_FREQUENCIES.map(freq => (
                                                    <SelectItem key={freq.value} value={freq.value}>
                                                        {freq.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </CardContent>
                                </Card>

                                {/* Max Trades Per Day */}
                                <Card className="shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center">
                                            <BarChart2 className="h-4 w-4 mr-2 text-blue-500" />
                                            Daily Trade Limit
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Label className="mb-2 block">Maximum trades per day</Label>
                                        <Select
                                            value={config.maxTradesPerDay.toString()}
                                            onValueChange={value => handleConfigChange('maxTradesPerDay', parseInt(value))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select limit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MAX_TRADES_OPTIONS.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Second column */}
                            <div className="space-y-6">
                                {/* Investment Per Trade */}
                                <Card className="shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center">
                                            <DollarSign className="h-4 w-4 mr-2 text-blue-500" />
                                            Investment Amount
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Label className="mb-2 block">Maximum investment per trade</Label>
                                        <div className="flex items-center">
                                            <span className="bg-gray-100 dark:bg-gray-800 p-2 rounded-l-md border border-r-0 border-input">$</span>
                                            <Input
                                                type="number"
                                                value={config.investmentPerTrade}
                                                onChange={e => handleConfigChange('investmentPerTrade', parseInt(e.target.value))}
                                                className="rounded-l-none"
                                                min={10}
                                                max={100000}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Confidence Threshold */}
                                <Card className="shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center">
                                            <GaugeCircle className="h-4 w-4 mr-2 text-blue-500" />
                                            Confidence Threshold
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between mb-2">
                                            <Label>Minimum confidence to trade</Label>
                                            <span className="text-sm font-medium">{(config.minConfidence * 100).toFixed(0)}%</span>
                                        </div>
                                        <Slider
                                            value={[config.minConfidence * 100]}
                                            onValueChange={value => handleConfigChange('minConfidence', value[0] / 100)}
                                            min={50}
                                            max={95}
                                            step={5}
                                            className="py-4"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Conservative (95%)</span>
                                            <span>Balanced (70%)</span>
                                            <span>Aggressive (50%)</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Risk Management */}
                                <Card className="shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center">
                                            <Shield className="h-4 w-4 mr-2 text-blue-500" />
                                            Risk Management
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <Label>Stop Loss (%)</Label>
                                                <span className="text-sm font-medium">{config.stopLossPercent}%</span>
                                            </div>
                                            <Slider
                                                value={[config.stopLossPercent]}
                                                onValueChange={value => handleConfigChange('stopLossPercent', value[0])}
                                                min={0.5}
                                                max={15}
                                                step={0.5}
                                                className="py-4"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <Label>Take Profit (%)</Label>
                                                <span className="text-sm font-medium">{config.takeProfitPercent}%</span>
                                            </div>
                                            <Slider
                                                value={[config.takeProfitPercent]}
                                                onValueChange={value => handleConfigChange('takeProfitPercent', value[0])}
                                                min={0.5}
                                                max={50}
                                                step={0.5}
                                                className="py-4"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col space-y-1">
                                                <Label htmlFor="trailing-stop">Use Trailing Stop</Label>
                                                <span className="text-sm text-muted-foreground">
                                                    Automatically move stop loss as price moves in your favor
                                                </span>
                                            </div>
                                            <Switch
                                                id="trailing-stop"
                                                checked={config.useTrailingStop}
                                                onCheckedChange={value => handleConfigChange('useTrailingStop', value)}
                                            />
                                        </div>

                                        {config.useTrailingStop && (
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <Label>Trailing Stop Distance (%)</Label>
                                                    <span className="text-sm font-medium">{config.trailingStopPercent}%</span>
                                                </div>
                                                <Slider
                                                    value={[config.trailingStopPercent]}
                                                    onValueChange={value => handleConfigChange('trailingStopPercent', value[0])}
                                                    min={0.5}
                                                    max={10}
                                                    step={0.5}
                                                    className="py-4"
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Trading Symbols */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center">
                                    <Zap className="h-4 w-4 mr-2 text-blue-500" />
                                    Trading Symbols
                                </CardTitle>
                                <CardDescription>
                                    Select the symbols you want the bot to trade
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
                                    {watchlist.map(item => (
                                        <div
                                            key={item.symbol}
                                            className={`p-3 rounded-md cursor-pointer border ${config.symbols.includes(item.symbol)
                                                ? 'bg-primary/10 border-primary'
                                                : 'border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                            onClick={() => toggleSymbol(item.symbol)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm">{item.symbol}</span>
                                                {config.symbols.includes(item.symbol) && (
                                                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">{item.name}</div>
                                        </div>
                                    ))}
                                </div>
                                {watchlist.length > 0 && (
                                    <div className="mt-4 flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            {config.symbols.length} of {watchlist.length} symbols selected
                                        </p>
                                        {config.symbols.length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setConfig(prev => ({ ...prev, symbols: [] }))}>
                                                Clear Selection
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Save Settings */}
                        <div className="flex justify-end space-x-4 pt-4">
                            <Button variant="outline" onClick={() => fetchBotStatus()}>
                                Cancel
                            </Button>
                            <Button onClick={updateBotConfig}>
                                Save Settings
                            </Button>
                        </div>
                    </TabsContent>

                    {/* History Tab */}
                    <TabsContent value="history">
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium mb-4">Recent Trades</h3>

                            <Card className="shadow-sm overflow-hidden">
                                {tradeHistory.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Symbol</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Price</TableHead>
                                                    <TableHead>Quantity</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tradeHistory.map((trade, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{formatDate(trade.timestamp)}</TableCell>
                                                        <TableCell className="font-medium">{trade.symbol}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={trade.tradeType === 'BUY' ? 'default' : 'destructive'} className={trade.tradeType === 'BUY' ? "bg-green-500 hover:bg-green-600" : ""}>
                                                                {trade.tradeType}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{formatCurrency(trade.price)}</TableCell>
                                                        <TableCell>{trade.quantity}</TableCell>
                                                        <TableCell>
                                                            {trade.success ? (
                                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                    Executed
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                                    Failed
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 bg-gray-50 dark:bg-gray-900 rounded-md">
                                        <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="font-medium text-lg mb-2">No trade history</h3>
                                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                            Start the bot to begin trading. Your trade history will appear here.
                                        </p>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row sm:justify-between border-t py-4 px-6 gap-4">
                <div className="text-sm text-muted-foreground">
                    {lastUpdated ? (
                        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                    ) : (
                        <span>Not yet updated</span>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                        Notifications:
                    </span>
                    <Switch
                        checked={config.notificationsEnabled}
                        onCheckedChange={value => handleConfigChange('notificationsEnabled', value)}
                    />
                </div>
            </CardFooter>
        </Card>
    );
} 