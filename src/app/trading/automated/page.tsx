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
    BarChart2
} from "lucide-react";
import { ConnectBroker } from "@/components/broker/connect-broker";

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
        brokerId: ""
    });

    // State for AI signals
    const [signals, setSignals] = useState<TradeSignal[]>([]);
    const [loadingSignals, setLoadingSignals] = useState(false);

    // State for trades history
    const [tradesHistory, setTradesHistory] = useState<any[]>([]);

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

            const response = await fetch(`/api/ai-trading-agent?${new URLSearchParams({
                symbols: watchlist.map(item => item.symbol).join(',')
            })}`);

            if (!response.ok) {
                throw new Error('Failed to get AI signals');
            }

            const data = await response.json();
            setSignals(data.signals || []);

            toast.success('AI signals updated successfully');
        } catch (error) {
            console.error('Error getting AI signals:', error);
            toast.error('Failed to get AI signals. Please try again.');
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

            // Update the enabled status
            setAutomationSettings(prev => ({
                ...prev,
                enabled
            }));

            toast.success('Automated trading enabled. The system will now trade based on your settings.');
        } else {
            // Just disable
            setAutomationSettings(prev => ({
                ...prev,
                enabled
            }));

            toast.info('Automated trading disabled.');
        }
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Automated Trading</h1>
                    <Button
                        onClick={() => router.push('/trading')}
                        variant="outline"
                    >
                        <ArrowUpRightFromCircle className="h-4 w-4 mr-2" />
                        Manual Trading
                    </Button>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="connect">Connect Broker</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Connect Your Broker</CardTitle>
                                <CardDescription>
                                    First, connect your broker account to enable automated trading
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center p-6">
                                    <p className="mb-4">
                                        To get started with automated trading, you need to connect your broker account.
                                    </p>
                                    <Button onClick={() => document.querySelector('[data-value="connect"]')?.dispatchEvent(new MouseEvent('click'))}>
                                        Connect Broker
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Connect Broker Tab */}
                    <TabsContent value="connect" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Connect Your Broker</CardTitle>
                                <CardDescription>
                                    Link your trading account to enable automated trading
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ConnectBroker />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Trading Settings</CardTitle>
                                <CardDescription>
                                    Configure your automated trading parameters
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center p-6">
                                    <p>
                                        Please connect your broker first to access trading settings.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
} 