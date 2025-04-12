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
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="brokers">Broker Integration</TabsTrigger>
                        <TabsTrigger value="settings">Automation Settings</TabsTrigger>
                        <TabsTrigger value="history">Trade History</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Automation Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            {automationSettings.enabled ? (
                                                <>
                                                    <Badge className="bg-green-500">Active</Badge>
                                                    <span className="text-sm text-muted-foreground">Trading enabled</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Badge variant="outline">Disabled</Badge>
                                                    <span className="text-sm text-muted-foreground">Trading disabled</span>
                                                </>
                                            )}
                                        </div>
                                        <Switch
                                            checked={automationSettings.enabled}
                                            onCheckedChange={toggleAutomation}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Connected Brokers</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {brokerConnections.filter(b => b.connected).length > 0 ? (
                                            brokerConnections
                                                .filter(b => b.connected)
                                                .map(broker => (
                                                    <div key={broker.id} className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <Badge className="bg-blue-500">{broker.name}</Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                Connected {broker.connectedAt ? new Date(broker.connectedAt).toLocaleDateString() : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="flex items-center space-x-2 text-muted-foreground">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span>No brokers connected</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.querySelector('[data-value="brokers"]')?.dispatchEvent(new MouseEvent('click'))}
                                    >
                                        Manage connections
                                    </Button>
                                </CardFooter>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">AI Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {signals.length > 0 ? (
                                            <div className="text-sm">
                                                <div>Signals analyzed: {signals.length}</div>
                                                <div>Buy signals: {signals.filter(s => s.action === 'BUY').length}</div>
                                                <div>Sell signals: {signals.filter(s => s.action === 'SELL').length}</div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-2 text-muted-foreground">
                                                <BarChart2 className="h-4 w-4" />
                                                <span>No signals analyzed yet</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        size="sm"
                                        onClick={getAISignals}
                                        disabled={loadingSignals}
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
                                </CardFooter>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Watchlist */}
                            <Card className="col-span-1">
                                <CardHeader>
                                    <CardTitle>Watchlist</CardTitle>
                                    <CardDescription>Stocks being monitored by the AI agent</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex space-x-2">
                                            <Input
                                                placeholder="Add symbol (e.g. TATASTEEL.NS)"
                                                value={newSymbol}
                                                onChange={(e) => setNewSymbol(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addToWatchlist()}
                                            />
                                            <Button onClick={addToWatchlist} size="icon">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Symbol</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {watchlist.map((item) => (
                                                    <TableRow key={item.symbol}>
                                                        <TableCell className="font-medium">{item.symbol}</TableCell>
                                                        <TableCell>{item.name}</TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeFromWatchlist(item.symbol)}
                                                            >
                                                                <Trash className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* AI Signals */}
                            <Card className="col-span-1">
                                <CardHeader>
                                    <CardTitle>AI Trading Signals</CardTitle>
                                    <CardDescription>Recent trading recommendations from the AI</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {signals.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Symbol</TableHead>
                                                    <TableHead>Action</TableHead>
                                                    <TableHead>Price</TableHead>
                                                    <TableHead>Confidence</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {signals.map((signal) => (
                                                    <TableRow key={signal.symbol}>
                                                        <TableCell className="font-medium">{signal.symbol}</TableCell>
                                                        <TableCell>
                                                            {signal.action === 'BUY' ? (
                                                                <Badge className="bg-green-500 flex items-center w-16 justify-center">
                                                                    <TrendingUp className="h-3 w-3 mr-1" />
                                                                    BUY
                                                                </Badge>
                                                            ) : signal.action === 'SELL' ? (
                                                                <Badge className="bg-red-500 flex items-center w-16 justify-center">
                                                                    <TrendingDown className="h-3 w-3 mr-1" />
                                                                    SELL
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="flex items-center w-16 justify-center">
                                                                    HOLD
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>₹{signal.price.toFixed(2)}</TableCell>
                                                        <TableCell>{(signal.confidence * 100).toFixed(0)}%</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-6 text-center">
                                            <div className="rounded-full p-3 bg-muted mb-4">
                                                <BarChart2 className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-medium mb-2">No signals yet</h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Click 'Analyze Now' to get the latest trading signals from our AI
                                            </p>
                                            <Button
                                                onClick={getAISignals}
                                                disabled={loadingSignals}
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

                    {/* Broker Integration Tab */}
                    <TabsContent value="brokers" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Connect Your Broker</CardTitle>
                                <CardDescription>Link your trading account to enable automated trading</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="broker-select">Select Broker</Label>
                                            <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                                                <SelectTrigger id="broker-select">
                                                    <SelectValue placeholder="Select a broker" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SUPPORTED_BROKERS.map(broker => (
                                                        <SelectItem key={broker.id} value={broker.id}>
                                                            {broker.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Button
                                            onClick={() => connectBroker(selectedBroker)}
                                            disabled={!selectedBroker || isConnecting}
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                <>
                                                    <ConeIcon className="h-4 w-4 mr-2" />
                                                    Connect Broker
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <h3 className="text-lg font-medium mb-2">Connected Brokers</h3>

                                        {brokerConnections.length > 0 ? (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Broker</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Connected Since</TableHead>
                                                        <TableHead>Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {brokerConnections.map(broker => (
                                                        <TableRow key={broker.id}>
                                                            <TableCell className="font-medium">{broker.name}</TableCell>
                                                            <TableCell>
                                                                {broker.connected ? (
                                                                    <Badge className="bg-green-500">Connected</Badge>
                                                                ) : (
                                                                    <Badge variant="outline">Disconnected</Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {broker.connectedAt
                                                                    ? new Date(broker.connectedAt).toLocaleDateString()
                                                                    : 'N/A'
                                                                }
                                                            </TableCell>
                                                            <TableCell>
                                                                {broker.connected ? (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => disconnectBroker(broker.id)}
                                                                    >
                                                                        Disconnect
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => connectBroker(broker.id)}
                                                                    >
                                                                        Reconnect
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <div className="text-center p-4 bg-muted rounded-md">
                                                <p className="text-muted-foreground">No brokers connected yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Automation Settings Tab */}
                    <TabsContent value="settings" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Trading Parameters</CardTitle>
                                <CardDescription>Configure how the AI agent will trade</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="automation-enabled">Automated Trading</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Enable or disable the AI trading agent
                                            </p>
                                        </div>
                                        <Switch
                                            id="automation-enabled"
                                            checked={automationSettings.enabled}
                                            onCheckedChange={toggleAutomation}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="broker-select">Trading Broker</Label>
                                        <Select
                                            value={automationSettings.brokerId}
                                            onValueChange={(value) => updateAutomationSettings('brokerId', value)}
                                            disabled={!brokerConnections.some(b => b.connected)}
                                        >
                                            <SelectTrigger id="broker-select">
                                                <SelectValue placeholder="Select a connected broker" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {brokerConnections
                                                    .filter(b => b.connected)
                                                    .map(broker => (
                                                        <SelectItem key={broker.id} value={broker.id}>
                                                            {broker.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        {!brokerConnections.some(b => b.connected) && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Please connect a broker first in the Broker Integration tab.
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="check-interval">Check Interval (minutes)</Label>
                                            <Input
                                                id="check-interval"
                                                type="number"
                                                value={automationSettings.interval}
                                                onChange={(e) => updateAutomationSettings('interval', parseInt(e.target.value))}
                                                min={1}
                                                max={60}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                How often the AI checks for trading opportunities
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="max-trades">Max Trades Per Day</Label>
                                            <Input
                                                id="max-trades"
                                                type="number"
                                                value={automationSettings.maxTradesPerDay}
                                                onChange={(e) => updateAutomationSettings('maxTradesPerDay', parseInt(e.target.value))}
                                                min={1}
                                                max={50}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Limit the number of trades the AI can make per day
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="investment-amount">Investment Per Trade (₹)</Label>
                                            <Input
                                                id="investment-amount"
                                                type="number"
                                                value={automationSettings.investmentPerTrade}
                                                onChange={(e) => updateAutomationSettings('investmentPerTrade', parseInt(e.target.value))}
                                                min={100}
                                                step={100}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Amount to invest in each automated trade
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confidence-threshold">Confidence Threshold (%)</Label>
                                            <Input
                                                id="confidence-threshold"
                                                type="number"
                                                value={automationSettings.confidenceThreshold * 100}
                                                onChange={(e) => updateAutomationSettings('confidenceThreshold', parseInt(e.target.value) / 100)}
                                                min={50}
                                                max={95}
                                                step={5}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Minimum confidence level required for AI to execute trades
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline">Reset to Defaults</Button>
                                <Button
                                    disabled={!automationSettings.brokerId}
                                >
                                    Save Settings
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* Trade History Tab */}
                    <TabsContent value="history" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Trading History</CardTitle>
                                <CardDescription>Record of trades executed by the AI agent</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {tradesHistory.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date & Time</TableHead>
                                                <TableHead>Symbol</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Price</TableHead>
                                                <TableHead>Quantity</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tradesHistory.map((trade, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{new Date(trade.timestamp).toLocaleString()}</TableCell>
                                                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                                                    <TableCell>
                                                        {trade.type === 'BUY' ? (
                                                            <Badge className="bg-green-500">BUY</Badge>
                                                        ) : (
                                                            <Badge className="bg-red-500">SELL</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>₹{trade.price.toFixed(2)}</TableCell>
                                                    <TableCell>{trade.quantity}</TableCell>
                                                    <TableCell>
                                                        {trade.status === 'COMPLETED' ? (
                                                            <Badge className="bg-green-500">Completed</Badge>
                                                        ) : trade.status === 'PENDING' ? (
                                                            <Badge variant="outline">Pending</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">Failed</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-6 text-center">
                                        <div className="rounded-full p-3 bg-muted mb-4">
                                            <Activity className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-medium mb-2">No trading history</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Once the AI agent starts trading, your history will appear here
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