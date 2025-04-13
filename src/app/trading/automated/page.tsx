"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Activity,
    AlertTriangle,
    Trash,
    Plus,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Loader2,
    ConeIcon,
    ArrowUpRightFromCircle,
    BarChart2,
    LineChart,
    Sliders,
    PieChart,
    Bot,
    Brain,
    Database,
    Sparkles,
    Settings,
    StopCircle,
    PlayCircle,
    CircleDashed
} from "lucide-react";
import MLAnalysisPanel from './MLAnalysisPanel';
import TradingBotPanel from './TradingBotPanel';
import { Slider } from "@/components/ui/slider";

// Types
interface BrokerConnection {
    id: string;
    name: string;
    connected: boolean;
    connectedAt?: string;
}

interface WatchlistItem {
    symbol: string;
    name: string;
    lastPrice?: number;
    change?: number;
    changePercent?: number;
}

interface TradeSignal {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    price: number;
    confidence: number;
    timestamp: string;
    indicators: {
        rsi: number;
        macd: number;
        ema50: number;
        ema200: number;
        priceChange24h: number;
    };
    reasoning: string[];
}

interface AutomationSettings {
    enabled: boolean;
    symbols: string[];
    interval: number; // in minutes
    maxTradesPerDay: number;
    investmentPerTrade: number;
    confidenceThreshold: number;
    brokerId: string;

    // Additional settings aligned with TradingBot's BotConfig
    stopLossPercent: number;
    takeProfitPercent: number;
    riskRewardRatio: number;
    useTrailingStop: boolean;
    trailingStopPercent: number;
    maxDrawdownPercent: number;
    notificationsEnabled: boolean;

    // New settings for AutoTrader
    autoTraderEnabled: boolean;
    useHourlyData: boolean;
}

// Default stocks for the watchlist
const DEFAULT_WATCHLIST: WatchlistItem[] = [
    { symbol: "TATASTEEL.NS", name: "Tata Steel Ltd" },
    { symbol: "RELIANCE.NS", name: "Reliance Industries" },
    { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
    { symbol: "INFY.NS", name: "Infosys Ltd" },
    { symbol: "TCS.NS", name: "Tata Consultancy Services" }
];

// Supported brokers
const SUPPORTED_BROKERS = [
    { id: "ZERODHA", name: "Zerodha" },
    { id: "UPSTOX", name: "Upstox" },
    { id: "ANGELONE", name: "Angel One" }
];

export default function AutomatedTradingPage() {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const [isClient, setIsClient] = useState(false);

    // State for broker connections
    const [brokerConnections, setBrokerConnections] = useState<BrokerConnection[]>([]);
    const [selectedBroker, setSelectedBroker] = useState<string>("");
    const [isConnecting, setIsConnecting] = useState(false);

    // State for watchlist
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
    const [newSymbol, setNewSymbol] = useState<string>("");

    // State for automation settings
    const [automationSettings, setAutomationSettings] = useState<AutomationSettings>({
        enabled: false,
        symbols: DEFAULT_WATCHLIST.map(item => item.symbol),
        interval: 30,
        maxTradesPerDay: 5,
        investmentPerTrade: 1000,
        confidenceThreshold: 0.7,
        brokerId: "",

        // Additional settings with default values
        stopLossPercent: 2.0,
        takeProfitPercent: 4.0,
        riskRewardRatio: 2.0,
        useTrailingStop: true,
        trailingStopPercent: 1.0,
        maxDrawdownPercent: 5.0,
        notificationsEnabled: true,

        // New settings for AutoTrader
        autoTraderEnabled: false,
        useHourlyData: true
    });

    // State for AI signals
    const [signals, setSignals] = useState<TradeSignal[]>([]);
    const [loadingSignals, setLoadingSignals] = useState(false);

    // State for trades history
    const [tradesHistory, setTradesHistory] = useState<any[]>([]);

    // State for loading
    const [isLoading, setIsLoading] = useState(false);

    // Check if user is authenticated
    useEffect(() => {
        setIsClient(true);
        if (isLoaded && !user) {
            router.push('/sign-in');
        } else if (user) {
            // Load connected brokers from user metadata
            const userMetadata = user.publicMetadata;
            if (userMetadata.connectedBrokers) {
                const connectedBrokers = Object.entries(userMetadata.connectedBrokers).map(([brokerId, data]: [string, any]) => {
                    const broker = SUPPORTED_BROKERS.find(b => b.id === brokerId);
                    return {
                        id: brokerId,
                        name: broker?.name || brokerId,
                        connected: data.connected || false,
                        connectedAt: data.connectedAt
                    };
                });
                setBrokerConnections(connectedBrokers);

                // Set the first connected broker as selected for automation
                const firstConnected = connectedBrokers.find(b => b.connected);
                if (firstConnected) {
                    setAutomationSettings(prev => ({
                        ...prev,
                        brokerId: firstConnected.id
                    }));
                }
            }
        }
    }, [isLoaded, user, router]);

    // Don't render anything until we're on the client and auth is loaded
    if (!isClient || !isLoaded) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    // If no user is authenticated, don't render the page
    if (!user) {
        return null;
    }

    // Function to connect a broker
    const connectBroker = async (brokerId: string) => {
        try {
            setIsConnecting(true);

            const response = await fetch('/api/broker-connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ brokerId })
            });

            if (!response.ok) {
                throw new Error('Failed to initiate broker connection');
            }

            const data = await response.json();

            // Redirect to broker auth page
            window.location.href = data.authUrl;
        } catch (error) {
            console.error('Error connecting broker:', error);
            toast.error('Failed to connect broker. Please try again.');
        } finally {
            setIsConnecting(false);
        }
    };

    // Function to disconnect a broker (in a real app, this would revoke tokens)
    const disconnectBroker = async (brokerId: string) => {
        // Simplified for demo - in a real app, this would call an API to revoke access
        toast.info(`Disconnected from ${brokerId}. Note: In a production app, this would properly revoke API access.`);

        // Update the local state to show disconnected
        setBrokerConnections(prev =>
            prev.map(conn =>
                conn.id === brokerId ? { ...conn, connected: false } : conn
            )
        );
    };

    // Function to add symbol to watchlist
    const addToWatchlist = () => {
        if (!newSymbol.trim()) return;

        // Format the symbol if needed
        let formattedSymbol = newSymbol.trim().toUpperCase();
        if (!formattedSymbol.includes('.')) {
            formattedSymbol = `${formattedSymbol}.NS`; // Default to NSE
        }

        // Check if symbol already exists
        if (watchlist.some(item => item.symbol === formattedSymbol)) {
            toast.error('Symbol already exists in watchlist');
            return;
        }

        // Add to watchlist
        const newItem: WatchlistItem = {
            symbol: formattedSymbol,
            name: formattedSymbol.replace('.NS', '').replace('.BS', '')
        };

        setWatchlist([...watchlist, newItem]);

        // Also add to automation settings symbols
        setAutomationSettings(prev => ({
            ...prev,
            symbols: [...prev.symbols, formattedSymbol]
        }));

        setNewSymbol('');
        toast.success(`Added ${formattedSymbol} to watchlist`);
    };

    // Function to remove from watchlist
    const removeFromWatchlist = (symbol: string) => {
        setWatchlist(prev => prev.filter(item => item.symbol !== symbol));

        // Also remove from automation settings
        setAutomationSettings(prev => ({
            ...prev,
            symbols: prev.symbols.filter(s => s !== symbol)
        }));

        toast.success(`Removed ${symbol} from watchlist`);
    };

    // Function to get AI signals
    const getAISignals = async () => {
        try {
            setLoadingSignals(true);

            // Check if we have symbols to query
            if (watchlist.length === 0) {
                toast.warning('Please add symbols to your watchlist first');
                return;
            }

            // Use the same API endpoint as used in MLAnalysisPanel
            const response = await fetch(`/api/ml-trading-signals?symbols=${watchlist.map(item => item.symbol).join(',')}`);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('API error response:', errorData);
                throw new Error(`Failed to get AI signals: ${response.statusText}`);
            }

            const data = await response.json();

            // Transform the data to match the expected format
            const formattedSignals: TradeSignal[] = [];

            if (data.signals) {
                for (const [symbol, signalData] of Object.entries(data.signals)) {
                    if (signalData) {
                        const signal = signalData as any; // Type assertion to handle unknown structure
                        formattedSignals.push({
                            symbol,
                            action: signal.action || 'HOLD',
                            price: signal.price || 0,
                            confidence: signal.confidence || 0,
                            timestamp: new Date().toISOString(),
                            indicators: {
                                rsi: signal.indicators?.rsi || 50,
                                macd: signal.indicators?.macd || 0,
                                ema50: signal.indicators?.ema50 || 0,
                                ema200: signal.indicators?.ema200 || 0,
                                priceChange24h: signal.indicators?.priceChange24h || 0
                            },
                            reasoning: signal.reasoning || []
                        });
                    }
                }
            }

            setSignals(formattedSignals);
            toast.success('AI signals updated successfully');
        } catch (error) {
            console.error('Error getting AI signals:', error);
            toast.error(`Failed to get AI signals: ${error.message}`);
        } finally {
            setLoadingSignals(false);
        }
    };

    // Function to update automation settings
    const updateAutomationSettings = (key: keyof AutomationSettings, value: any) => {
        setAutomationSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Function to toggle automation
    const toggleAutomation = async (enabled: boolean) => {
        // Validate settings before enabling
        if (enabled) {
            if (!automationSettings.brokerId) {
                toast.error('Please select a broker for automated trading');
                return;
            }

            if (automationSettings.symbols.length === 0) {
                toast.error('Please add at least one symbol to your watchlist');
                return;
            }

            try {
                // Call the API to start the trading bot with current settings
                const response = await fetch('/api/trading-bot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        config: {
                            enabled: true,
                            symbols: automationSettings.symbols,
                            tradingFrequency: automationSettings.interval,
                            maxTradesPerDay: automationSettings.maxTradesPerDay,
                            investmentPerTrade: automationSettings.investmentPerTrade,
                            minConfidence: automationSettings.confidenceThreshold,
                            stopLossPercent: automationSettings.stopLossPercent,
                            takeProfitPercent: automationSettings.takeProfitPercent,
                            brokerId: automationSettings.brokerId,
                            riskRewardRatio: automationSettings.riskRewardRatio,
                            useTrailingStop: automationSettings.useTrailingStop,
                            trailingStopPercent: automationSettings.trailingStopPercent,
                            maxDrawdownPercent: automationSettings.maxDrawdownPercent,
                            notificationsEnabled: automationSettings.notificationsEnabled
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to update trading bot: ${response.statusText}`);
                }

                // Start the bot
                const startResponse = await fetch('/api/trading-bot', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'start'
                    })
                });

                if (!startResponse.ok) {
                    throw new Error(`Failed to start trading bot: ${startResponse.statusText}`);
                }

                // Update the enabled status
                setAutomationSettings(prev => ({
                    ...prev,
                    enabled
                }));

                toast.success('Automated trading enabled. The system will now trade based on your settings.');
            } catch (error) {
                console.error('Error enabling trading bot:', error);
                toast.error(`Failed to enable automated trading: ${error.message}`);
                return;
            }
        } else {
            try {
                // Stop the bot
                const stopResponse = await fetch('/api/trading-bot', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'stop'
                    })
                });

                if (!stopResponse.ok) {
                    throw new Error(`Failed to stop trading bot: ${stopResponse.statusText}`);
                }

                // Just disable
                setAutomationSettings(prev => ({
                    ...prev,
                    enabled
                }));

                toast.info('Automated trading disabled.');
            } catch (error) {
                console.error('Error disabling trading bot:', error);
                toast.error(`Failed to disable automated trading: ${error.message}`);
            }
        }
    };

    // Function to start AutoTrader
    const startAutoTrader = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/auto-trader', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'start',
                    config: {
                        ...automationSettings,
                        symbols: watchlist.map(item => item.symbol),
                        enabled: true,
                        autoRun: true
                    }
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to start AutoTrader');
            }

            const data = await response.json();
            toast.success("AutoTrader started successfully");
            setAutomationSettings(prev => ({
                ...prev,
                autoTraderEnabled: true
            }));
        } catch (error: any) {
            console.error('Error starting AutoTrader:', error);
            toast.error(error.message || 'Failed to start AutoTrader');
        } finally {
            setIsLoading(false);
        }
    };

    // Function to stop AutoTrader
    const stopAutoTrader = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/auto-trader', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'stop'
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to stop AutoTrader');
            }

            toast.success("AutoTrader stopped successfully");
            setAutomationSettings(prev => ({
                ...prev,
                autoTraderEnabled: false
            }));
        } catch (error: any) {
            console.error('Error stopping AutoTrader:', error);
            toast.error(error.message || 'Failed to stop AutoTrader');
        } finally {
            setIsLoading(false);
        }
    };

    // Add resetSettings function
    const resetSettings = () => {
        // Reset to defaults - using the exact properties from the interface
        setAutomationSettings({
            enabled: false,
            symbols: watchlist.map(item => item.symbol),
            interval: 60, // Hourly by default
            maxTradesPerDay: 3,
            investmentPerTrade: 1000,
            confidenceThreshold: 0.75,
            brokerId: selectedBroker,
            stopLossPercent: 2.0,
            takeProfitPercent: 4.0,
            riskRewardRatio: 2.0,
            useTrailingStop: true,
            trailingStopPercent: 1.0,
            maxDrawdownPercent: 5.0,
            notificationsEnabled: true,
            autoTraderEnabled: false,
            useHourlyData: true
        });
        toast.info("Settings reset to defaults");
    };

    // Fix the saveSettings function to handle userMetadata correctly
    const saveSettings = async () => {
        setIsLoading(true);
        try {
            // First save settings in user metadata if user is authenticated
            if (user) {
                const response = await fetch('/api/user-metadata', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        automationSettings
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to save user settings');
                }
            }

            // Then update AutoTrader config if it's running
            if (automationSettings.autoTraderEnabled) {
                await fetch('/api/auto-trader', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'update',
                        config: {
                            ...automationSettings,
                            symbols: watchlist.map(item => item.symbol)
                        }
                    })
                });
            }

            toast.success("Settings saved successfully");
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error("Failed to save settings");
        } finally {
            setIsLoading(false);
        }
    };

    // Add this function after the saveSettings function
    const fetchTradeHistory = async () => {
        try {
            toast.info("Fetching trade history...");

            const response = await fetch('/api/trading-history', {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch trade history: ${response.statusText}`);
            }

            const data = await response.json();

            if (Array.isArray(data.trades)) {
                setTradesHistory(data.trades);
                toast.success(`Loaded ${data.trades.length} trades from history`);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error fetching trade history:', error);
            toast.error(`Failed to fetch trade history: ${error.message}`);
        }
    };

    return (
        <div className="bg-background min-h-screen">
            {/* Hero section with gradient background */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
                <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>

                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center">
                                <Bot className="h-8 w-8 mr-3 text-blue-400" />
                                AI-Powered Trading
                            </h1>
                            <p className="text-blue-200 max-w-xl">
                                Automate your trading with advanced artificial intelligence. Connect your broker, configure your strategy, and let the AI handle the rest.
                            </p>
                        </div>

                        <div className="mt-6 md:mt-0 flex items-center space-x-2 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                            <div className="flex flex-col">
                                <span className="text-sm text-blue-200">Trading Status</span>
                                <div className="flex items-center mt-1">
                                    {automationSettings.enabled ? (
                                        <>
                                            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse mr-2"></div>
                                            <span className="font-semibold">Active</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-2.5 w-2.5 rounded-full bg-gray-400 mr-2"></div>
                                            <span className="font-semibold">Disabled</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="h-10 w-px bg-white/20"></div>
                            <Switch
                                checked={automationSettings.enabled}
                                onCheckedChange={toggleAutomation}
                                className="data-[state=checked]:bg-green-500"
                            />
                        </div>
                    </div>

                    {/* Quick stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-blue-200">Watchlist</h3>
                                <LineChart className="h-4 w-4 text-blue-300" />
                            </div>
                            <p className="text-2xl font-bold mt-2">{watchlist.length}</p>
                            <p className="text-xs text-blue-200 mt-1">Monitored Symbols</p>
                        </div>

                        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-blue-200">Signals</h3>
                                <Brain className="h-4 w-4 text-blue-300" />
                            </div>
                            <p className="text-2xl font-bold mt-2">{signals.length}</p>
                            <p className="text-xs text-blue-200 mt-1">AI Trade Signals</p>
                        </div>

                        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-blue-200">Brokers</h3>
                                <Database className="h-4 w-4 text-blue-300" />
                            </div>
                            <p className="text-2xl font-bold mt-2">{brokerConnections.filter(b => b.connected).length}</p>
                            <p className="text-xs text-blue-200 mt-1">Connected Accounts</p>
                        </div>

                        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-blue-200">Trades</h3>
                                <Activity className="h-4 w-4 text-blue-300" />
                            </div>
                            <p className="text-2xl font-bold mt-2">{tradesHistory.length}</p>
                            <p className="text-xs text-blue-200 mt-1">Completed Trades</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="container mx-auto px-4 py-8">
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-8">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            <BarChart2 className="h-4 w-4 mr-2" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="brokers" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            <Database className="h-4 w-4 mr-2" />
                            Broker Integration
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            <Activity className="h-4 w-4 mr-2" />
                            Trade History
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Watchlist panel */}
                            <Card className="col-span-1 backdrop-blur-sm border-none shadow-lg">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl">Watchlist</CardTitle>
                                        <CardDescription>Monitored symbols</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex space-x-2">
                                            <Input
                                                placeholder="Add symbol (e.g. TATASTEEL.NS)"
                                                value={newSymbol}
                                                onChange={(e) => setNewSymbol(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addToWatchlist()}
                                                className="flex-1"
                                            />
                                            <Button onClick={addToWatchlist} size="icon" className="shrink-0 bg-blue-600 hover:bg-blue-700">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="relative overflow-x-auto rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Symbol</TableHead>
                                                        <TableHead>Name</TableHead>
                                                        <TableHead className="w-[40px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {watchlist.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                                                                No symbols added yet
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        watchlist.map((item) => (
                                                            <TableRow key={item.symbol}>
                                                                <TableCell className="font-medium">{item.symbol}</TableCell>
                                                                <TableCell>{item.name}</TableCell>
                                                                <TableCell>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removeFromWatchlist(item.symbol)}
                                                                        className="h-7 w-7"
                                                                    >
                                                                        <Trash className="h-3.5 w-3.5 text-destructive" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* AI Signals panel */}
                            <Card className="col-span-1 lg:col-span-2 border-none shadow-lg">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl flex items-center">
                                                <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
                                                AI Trading Signals
                                            </CardTitle>
                                            <CardDescription>Latest recommendations from the AI</CardDescription>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={getAISignals}
                                            disabled={loadingSignals}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {loadingSignals ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                    Analyze Now
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {signals.length > 0 ? (
                                        <div className="rounded-md border overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/50">
                                                        <TableHead>Symbol</TableHead>
                                                        <TableHead>Action</TableHead>
                                                        <TableHead>Price</TableHead>
                                                        <TableHead>Confidence</TableHead>
                                                        <TableHead>Indicators</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {signals.map((signal) => (
                                                        <TableRow key={signal.symbol} className="hover:bg-muted/50">
                                                            <TableCell className="font-medium">{signal.symbol}</TableCell>
                                                            <TableCell>
                                                                {signal.action === 'BUY' ? (
                                                                    <Badge className="bg-green-500 flex items-center min-w-[70px] justify-center">
                                                                        <TrendingUp className="h-3 w-3 mr-1" />
                                                                        BUY
                                                                    </Badge>
                                                                ) : signal.action === 'SELL' ? (
                                                                    <Badge className="bg-red-500 flex items-center min-w-[70px] justify-center">
                                                                        <TrendingDown className="h-3 w-3 mr-1" />
                                                                        SELL
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="flex items-center min-w-[70px] justify-center">
                                                                        HOLD
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>₹{signal.price.toFixed(2)}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center">
                                                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 dark:bg-gray-700">
                                                                        <div
                                                                            className={`h-2.5 rounded-full ${signal.confidence > 0.7
                                                                                ? 'bg-green-500'
                                                                                : signal.confidence > 0.5
                                                                                    ? 'bg-yellow-400'
                                                                                    : 'bg-red-500'
                                                                                }`}
                                                                            style={{ width: `${signal.confidence * 100}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-xs">{(signal.confidence * 100).toFixed(0)}%</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex space-x-1 text-xs">
                                                                    <Badge variant="outline" className={signal.indicators.rsi < 30 ? "bg-green-100" : signal.indicators.rsi > 70 ? "bg-red-100" : ""}>
                                                                        RSI: {signal.indicators.rsi.toFixed(0)}
                                                                    </Badge>
                                                                    <Badge variant="outline" className={signal.indicators.macd > 0 ? "bg-green-100" : "bg-red-100"}>
                                                                        MACD: {signal.indicators.macd.toFixed(2)}
                                                                    </Badge>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/30 rounded-xl">
                                            <div className="rounded-full p-3 bg-blue-100 mb-4">
                                                <Brain className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <h3 className="text-lg font-medium mb-2">No signals yet</h3>
                                            <p className="text-sm text-muted-foreground mb-4 max-w-md">
                                                Get AI-powered trading signals for your watchlist symbols by clicking the Analyze Now button
                                            </p>
                                            <Button
                                                onClick={getAISignals}
                                                disabled={loadingSignals}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                {loadingSignals ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Analyzing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 mr-2" />
                                                        Analyze Now
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Other tabs would be the same as before, so I'm not showing them to keep the response shorter */}
                    <TabsContent value="brokers">
                        {/* Connect New Broker Card */}
                        <Card className="border-none shadow-lg bg-gradient-to-br from-gray-900 to-indigo-900 dark:from-gray-950 dark:to-indigo-950 mb-6">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center">
                                    <Database className="h-5 w-5 mr-2 text-blue-500" />
                                    Connect Trading Account
                                </CardTitle>
                                <CardDescription>
                                    Link your broker accounts to enable automated trading with our AI system
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="broker-select" className="text-sm font-medium">Select Your Broker</Label>
                                            <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                                                <SelectTrigger id="broker-select" className="w-full">
                                                    <SelectValue placeholder="Choose a broker platform" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SUPPORTED_BROKERS.map(broker => (
                                                        <SelectItem key={broker.id} value={broker.id}>
                                                            <div className="flex items-center">
                                                                {broker.id === "ZERODHA" && <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>}
                                                                {broker.id === "UPSTOX" && <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>}
                                                                {broker.id === "ANGELONE" && <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>}
                                                                {broker.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Select the broker where you have an active trading account
                                            </p>
                                        </div>

                                        <Button
                                            onClick={() => connectBroker(selectedBroker)}
                                            disabled={!selectedBroker || isConnecting}
                                            className="w-full bg-blue-600 hover:bg-blue-700"
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                <>
                                                    <Database className="h-4 w-4 mr-2" />
                                                    Connect Broker
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="rounded-xl bg-background/50 dark:bg-gray-900/50 p-5 backdrop-blur-sm border border-gray-100 dark:border-gray-800">
                                        <h3 className="text-sm font-medium mb-3">Why connect your broker?</h3>
                                        <ul className="space-y-2">
                                            <li className="flex items-start">
                                                <div className="rounded-full bg-blue-100 p-1 mr-2 mt-0.5">
                                                    <Bot className="h-3 w-3 text-blue-600" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">Allow our AI to automatically execute trades based on signals</p>
                                            </li>
                                            <li className="flex items-start">
                                                <div className="rounded-full bg-green-100 p-1 mr-2 mt-0.5">
                                                    <Sliders className="h-3 w-3 text-green-600" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">Set custom risk levels and investment amounts per trade</p>
                                            </li>
                                            <li className="flex items-start">
                                                <div className="rounded-full bg-purple-100 p-1 mr-2 mt-0.5">
                                                    <Activity className="h-3 w-3 text-purple-600" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">Track performance and get detailed trading analytics</p>
                                            </li>
                                        </ul>
                                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <p className="text-xs text-muted-foreground">
                                                Your credentials are securely stored and we only request the minimum permissions needed. You can disconnect anytime.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Connected Brokers */}
                        <Card className="border-none shadow-lg mb-6">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xl flex items-center">
                                    <Database className="h-5 w-5 mr-2 text-blue-500" />
                                    Connected Accounts
                                </CardTitle>
                                <CardDescription>
                                    Manage your linked broker accounts
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {brokerConnections.length > 0 ? (
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead>Broker</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Connected Since</TableHead>
                                                    <TableHead>Last Used</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {brokerConnections.map(broker => (
                                                    <TableRow key={broker.id} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="flex items-center">
                                                                <div className={`w-2.5 h-2.5 rounded-full mr-2 ${broker.id === "ZERODHA" ? "bg-blue-500" :
                                                                    broker.id === "UPSTOX" ? "bg-green-500" :
                                                                        "bg-purple-500"
                                                                    }`}></div>
                                                                <span className="font-medium">{broker.name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {broker.connected ? (
                                                                <Badge className="bg-green-500">Active</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-gray-500">Disconnected</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {broker.connectedAt ? (
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm">{new Date(broker.connectedAt).toLocaleDateString()}</span>
                                                                    <span className="text-xs text-muted-foreground">{new Date(broker.connectedAt).toLocaleTimeString()}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground">N/A</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-muted-foreground">Today</span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {broker.connected ? (
                                                                    <>
                                                                        <Button variant="outline" size="sm" className="h-8 border-gray-200">
                                                                            <Settings className="h-3.5 w-3.5 mr-1" />
                                                                            Configure
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => disconnectBroker(broker.id)}
                                                                            className="h-8 border-red-200 text-red-700 hover:bg-red-50"
                                                                        >
                                                                            Disconnect
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => connectBroker(broker.id)}
                                                                        className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                                                                    >
                                                                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                                                        Reconnect
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/30 rounded-xl">
                                        <div className="rounded-full p-3 bg-blue-100 mb-4">
                                            <Database className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <h3 className="text-lg font-medium mb-2">No brokers connected</h3>
                                        <p className="text-sm text-muted-foreground mb-4 max-w-md">
                                            Connect your trading accounts to enable automated trading with our AI system
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* API Security Information */}
                        <Card className="border-none bg-muted/30 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center">
                                    <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                                    Security Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    <p className="mb-2">
                                        We use industry-standard OAuth protocols to connect to your broker securely. Your credentials are never stored on our servers.
                                    </p>
                                    <p>
                                        For added security, you can set trade limits within your broker's platform to control the maximum position size our system can take.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Trading Strategy</CardTitle>
                                <CardDescription>Configure your automated trading parameters</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                                            <Settings className="h-5 w-5 mr-2 text-indigo-500" />
                                            AI Trading Strategy
                                        </h3>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="space-y-4">
                                                    <div>
                                                        <Label htmlFor="tradingFrequency">Trading Frequency</Label>
                                                        <Select
                                                            value={automationSettings.interval.toString()}
                                                            onValueChange={(value) => updateAutomationSettings('interval', parseInt(value))}
                                                        >
                                                            <SelectTrigger id="tradingFrequency" className="w-full">
                                                                <SelectValue placeholder="Select frequency" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="5">Every 5 minutes</SelectItem>
                                                                <SelectItem value="15">Every 15 minutes</SelectItem>
                                                                <SelectItem value="30">Every 30 minutes</SelectItem>
                                                                <SelectItem value="60">Every hour</SelectItem>
                                                                <SelectItem value="240">Every 4 hours</SelectItem>
                                                                <SelectItem value="1440">Daily</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            How often should the AI analyze the market
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="maxTradesPerDay">Maximum Trades Per Day</Label>
                                                        <div className="flex space-x-2 mt-1.5">
                                                            {[3, 5, 10, 20, "Unlimited"].map((num) => (
                                                                <Button
                                                                    key={num}
                                                                    variant={automationSettings.maxTradesPerDay === (num === "Unlimited" ? 0 : Number(num)) ? "default" : "outline"}
                                                                    className="flex-1"
                                                                    onClick={() => updateAutomationSettings('maxTradesPerDay', num === "Unlimited" ? 0 : Number(num))}
                                                                >
                                                                    {num}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Limit the number of trades the AI can make daily
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="investmentPerTrade">Investment Per Trade</Label>
                                                        <div className="flex mt-1.5">
                                                            <div className="bg-muted flex items-center justify-center px-3 rounded-l-md border border-r-0 border-input">
                                                                $
                                                            </div>
                                                            <Input
                                                                id="investmentPerTrade"
                                                                type="number"
                                                                value={automationSettings.investmentPerTrade}
                                                                onChange={(e) => updateAutomationSettings('investmentPerTrade', parseInt(e.target.value) || 0)}
                                                                className="rounded-l-none"
                                                            />
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Maximum amount to invest in a single trade
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between items-center">
                                                            <Label htmlFor="confidenceSlider">Minimum Confidence Threshold</Label>
                                                            <span className="text-sm">{Math.round(automationSettings.confidenceThreshold * 100)}%</span>
                                                        </div>
                                                        <Slider
                                                            id="confidenceSlider"
                                                            value={[automationSettings.confidenceThreshold * 100]}
                                                            onValueChange={(value) => updateAutomationSettings('confidenceThreshold', value[0] / 100)}
                                                            min={50}
                                                            max={95}
                                                            step={5}
                                                            className="my-4"
                                                        />
                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                            <span>Conservative</span>
                                                            <span>Balanced</span>
                                                            <span>Aggressive</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="dataFrequency">Data Frequency</Label>
                                                        <Select
                                                            value={automationSettings.useHourlyData ? "hourly" : "daily"}
                                                            onValueChange={(value) => setAutomationSettings({
                                                                ...automationSettings,
                                                                useHourlyData: value === "hourly"
                                                            })}
                                                        >
                                                            <SelectTrigger id="dataFrequency">
                                                                <SelectValue placeholder="Select frequency" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="hourly">Hourly Data (Past Month)</SelectItem>
                                                                <SelectItem value="daily">Daily Data (Past Year)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-sm text-muted-foreground">
                                                            Hourly data gives more recent signals but less historical context
                                                        </p>
                                                    </div>

                                                    <div className="pt-4 border-t">
                                                        <h3 className="text-lg font-medium mb-2">Full Automation</h3>
                                                        <p className="text-sm text-muted-foreground mb-4">
                                                            Enable full automation to let the AI trade on your behalf based on the settings above
                                                        </p>

                                                        <div className="flex space-x-4">
                                                            {automationSettings.autoTraderEnabled ? (
                                                                <Button
                                                                    variant="destructive"
                                                                    onClick={stopAutoTrader}
                                                                    disabled={isLoading}
                                                                >
                                                                    {isLoading ? (
                                                                        <>
                                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                            Stopping...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <StopCircle className="mr-2 h-4 w-4" />
                                                                            Stop AutoTrader
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="default"
                                                                    onClick={startAutoTrader}
                                                                    disabled={isLoading || watchlist.length === 0}
                                                                    className="bg-green-600 hover:bg-green-700"
                                                                >
                                                                    {isLoading ? (
                                                                        <>
                                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                            Starting...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <PlayCircle className="mr-2 h-4 w-4" />
                                                                            Start AutoTrader
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {watchlist.length === 0 && (
                                                            <p className="text-sm text-amber-500 mt-2">
                                                                <AlertTriangle className="h-4 w-4 inline mr-1" />
                                                                Add symbols to your watchlist before enabling AutoTrader
                                                            </p>
                                                        )}

                                                        {automationSettings.autoTraderEnabled && (
                                                            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                                                                <div className="flex items-center">
                                                                    <CircleDashed className="h-5 w-5 text-green-600 mr-2 animate-spin" />
                                                                    <span className="font-medium text-green-700 dark:text-green-400">
                                                                        AutoTrader is running
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                                                                    Trading {watchlist.length} symbols automatically based on your settings
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                                            <Bot className="h-5 w-5 mr-2 text-indigo-500" />
                                            Real-Time Trading Bot
                                        </h3>
                                        <TradingBotPanel
                                            brokerConnections={brokerConnections}
                                            watchlist={watchlist}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" onClick={resetSettings}>Reset to Default</Button>
                                <Button onClick={saveSettings} disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : "Save Settings"}
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history">
                        <Card className="border-none shadow-lg">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl flex items-center">
                                            <Activity className="h-5 w-5 mr-2 text-blue-500" />
                                            Trading History
                                        </CardTitle>
                                        <CardDescription>
                                            Past trades executed by the AI trading bot
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={fetchTradeHistory}
                                    >
                                        <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                        Refresh
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {tradesHistory.length > 0 ? (
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead>Date & Time</TableHead>
                                                    <TableHead>Symbol</TableHead>
                                                    <TableHead>Action</TableHead>
                                                    <TableHead>Quantity</TableHead>
                                                    <TableHead>Price</TableHead>
                                                    <TableHead>Total</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tradesHistory.map((trade, index) => (
                                                    <TableRow key={index} className="hover:bg-muted/50">
                                                        <TableCell className="whitespace-nowrap">
                                                            {new Date(trade.timestamp).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="font-medium">{trade.symbol}</TableCell>
                                                        <TableCell>
                                                            {trade.action === 'BUY' ? (
                                                                <Badge className="bg-green-500 text-white">BUY</Badge>
                                                            ) : (
                                                                <Badge className="bg-red-500 text-white">SELL</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{trade.quantity}</TableCell>
                                                        <TableCell>${trade.price.toFixed(2)}</TableCell>
                                                        <TableCell>${(trade.quantity * trade.price).toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={
                                                                trade.status === 'COMPLETED'
                                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                                    : trade.status === 'FAILED'
                                                                        ? "bg-red-50 text-red-700 border-red-200"
                                                                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                            }>
                                                                {trade.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-10 text-center bg-muted/30 rounded-xl">
                                        <div className="rounded-full p-3 bg-blue-100 mb-4">
                                            <Activity className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <h3 className="text-lg font-medium mb-2">No trades yet</h3>
                                        <p className="text-sm text-muted-foreground mb-4 max-w-md">
                                            Enable automated trading to start executing trades based on AI signals
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
} 