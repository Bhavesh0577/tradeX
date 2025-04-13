import { Button } from "@/components/custom-button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChartUI } from "@/components/chart-ui"
import { VaultTable } from "@/components/vault-table"
import { BarChart3, ChevronDown, Globe, Home, LayoutDashboard, LifeBuoy, Search, Settings, Wallet, LogOut, RefreshCw, TrendingUp, TrendingDown, AlertCircle, PieChart, BarChart, LineChart, CandlestickChart, Zap, ArrowUpCircle, ArrowDownCircle, BellRing } from "lucide-react"
import '../app/globals.css'
import { useState, useEffect, ReactElement, useRef } from "react"
import { useUser, UserButton, SignOutButton } from "@clerk/nextjs"
import { useRouter } from "next/router"
import MLAnalysisPanel from '@/app/trading/automated/MLAnalysisPanel'
import { ModelPrediction } from '@/lib/ml/tradingModel'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { WatchList } from '@/components/trading/watch-list'
import { TradingViewChart } from '@/components/trading/trading-view-chart'
import { TimeframeSelector } from '@/components/trading/timeframe-selector'
import { MarketIndices } from '@/components/trading/market-indices'
import { StockInfo } from '@/components/trading/stock-info'

// Dashboard metric card component
const MetricsCard = ({
  title,
  value,
  change,
  icon
}: {
  title: string,
  value: string,
  change: { value: string, percentage: string, isPositive: boolean },
  icon?: ({ className }: { className?: string }) => ReactElement
}) => {
  return (
    <Card className="border border-gray-800 bg-black/50 backdrop-blur">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          {icon && icon({ className: "h-8 w-8 text-gray-400" })}
        </div>
        <div className="mt-4 flex items-center">
          <span className={`inline-flex items-center text-sm ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {change.isPositive ? <ArrowUpCircle className="mr-1 h-4 w-4" /> : <ArrowDownCircle className="mr-1 h-4 w-4" />}
            {change.percentage}
          </span>
          <span className="text-sm text-gray-400 ml-2">{change.value}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Signal card component for quick info
const SignalCard = ({ signal }: { signal: ModelPrediction }) => {
  const actionColor = signal.action === 'BUY'
    ? 'bg-green-500/20 text-green-500'
    : signal.action === 'SELL'
      ? 'bg-red-500/20 text-red-500'
      : 'bg-yellow-500/20 text-yellow-500';

  return (
    <Card className="border border-gray-800 bg-black/50 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">{signal.symbol}</h4>
          <Badge className={actionColor}>
            {signal.action}
          </Badge>
        </div>
        <div className="mt-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Confidence</span>
            <span className="font-medium">{(signal.confidence * 100).toFixed(0)}%</span>
          </div>
          <Progress value={signal.confidence * 100} className="h-1.5 mt-1" />
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Target: {signal.priceTarget ? `$${signal.priceTarget.toFixed(2)}` : 'N/A'}
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC-USD");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<string>("1D");
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Market overview data
  const [marketOverview, setMarketOverview] = useState({
    totalMarketCap: "$2.45T",
    volume24h: "$89.2B",
    btcDominance: "52.6%"
  });

  // State for tracked symbols to analyze with ML model
  const [trackedSymbols, setTrackedSymbols] = useState<string[]>([
    "RELIANCE.NS", "HDFCBANK.NS", "TCS.NS", "INFY.NS", "TATASTEEL.NS"
  ]);

  // State for latest signals received from ML model
  const [latestSignals, setLatestSignals] = useState<ModelPrediction[]>([]);

  // Use useEffect to handle client-side authentication check
  useEffect(() => {
    setIsClient(true);
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  // Simulate loading market data
  useEffect(() => {
    const loadData = async () => {
      if (isClient && user) {
        setIsLoading(true);
        // Simulate data loading
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
      }
    };

    loadData();
  }, [isClient, user, selectedSymbol]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  // Don't render anything until we're on the client and auth is loaded
  if (!isClient || !isLoaded) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <p>Loading...</p>
    </div>;
  }

  // If no user is authenticated, don't render the dashboard
  if (!user) {
    return null;
  }

  const handleSearch = () => {
    if (searchInput.trim()) {
      setIsSearching(true);
      // Format the search input to match Yahoo Finance symbol format
      // If it doesn't contain a dash, assume it's a stock and add the exchange
      let formattedSymbol = searchInput.trim().toUpperCase();
      if (!formattedSymbol.includes("-")) {
        // Check if it's likely a crypto symbol
        if (["BTC", "ETH", "XRP", "LTC", "BCH", "ADA", "DOT", "LINK", "BNB", "USDT"].includes(formattedSymbol)) {
          formattedSymbol = `${formattedSymbol}-USD`;
        } else {
          // Assume it's a stock and add exchange if not present
          if (!formattedSymbol.includes(".")) {
            formattedSymbol = `${formattedSymbol}`;
          }
        }
      }

      setSelectedSymbol(formattedSymbol);
      setIsSearching(false);
      toast.success(`Now viewing ${formattedSymbol}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle new ML signals
  const handleSignalReceived = (signal: ModelPrediction) => {
    setLatestSignals(prev => {
      // Replace existing signal for this symbol or add new one
      const filtered = prev.filter(s => s.symbol !== signal.symbol);
      return [...filtered, signal].sort((a, b) => b.confidence - a.confidence);
    });

    // Show notification for high confidence signals
    if (signal.confidence > 0.8) {
      const action = signal.action === 'BUY' ? 'Buy' : signal.action === 'SELL' ? 'Sell' : 'Hold';
      toast.info(`High confidence ${action} signal for ${signal.symbol}: ${(signal.confidence * 100).toFixed(0)}%`);
    }
  };

  // Add symbol to watchlist
  const handleAddToWatchlist = () => {
    if (selectedSymbol && !trackedSymbols.includes(selectedSymbol)) {
      setTrackedSymbols(prev => [...prev, selectedSymbol]);
      toast.success(`Added ${selectedSymbol} to ML analysis watchlist`);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate a refresh
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Dashboard refreshed");
    }, 1000);
  };

  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf);
    toast.info(`Timeframe changed to ${tf}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-slate-900 text-white">
      <div className="grid lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-gray-800 bg-black/50 backdrop-blur">
          <div className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-purple-500" />
              <span className="font-bold text-xl">TradeX</span>
            </div>
            <div className="flex items-center gap-2">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search stock or crypto"
                className="bg-gray-800/50 text-white placeholder:text-gray-500 border-gray-700 focus:border-purple-300 transition-colors"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button
                size="icon"
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <nav className="space-y-2 px-2">
            <Button variant="ghost" className="w-full justify-start gap-2 text-purple-300" onClick={() => setActiveTab("overview")}>
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => window.location.href = '/trade'}>
              <CandlestickChart className="h-4 w-4" />
              Trading
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => window.location.href = 'https://www.tradingview.com/chart/8daX0FdT/'}>
              <BarChart3 className="h-4 w-4" />
              Market Analysis
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => window.location.href = '/trading/automated'}>
              <Zap className="h-4 w-4" />
              Automated Trading
            </Button>
            <Separator className="my-4 bg-gray-800" />
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => router.push('/profile')}>
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <div className="absolute bottom-4 left-0 right-0 px-2">
              <SignOutButton>
                <Button variant="ghost" className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-100/10">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          </nav>
        </aside>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-2xl">Trading Dashboard</h1>
              {user && (
                <p className="text-sm text-gray-400">
                  Welcome back, {user.firstName || user.username || 'User'}!
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-gray-800 bg-black/30"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-gray-800 bg-black/30"
                onClick={handleAddToWatchlist}
              >
                <BellRing className="h-4 w-4" />
                Track {selectedSymbol}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-900/50 border border-gray-800">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trading">Trading</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3">
                  <Card className="border-gray-800 bg-black/50 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Market Chart</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {isSearching ? "Searching..." : `${selectedSymbol} Performance`}
                        </p>
                      </div>
                      <TimeframeSelector
                        currentTimeframe={timeframe}
                        onTimeframeChange={handleTimeframeChange}
                      />
                    </CardHeader>
                    <CardContent>
                      <div className={`h-[400px] ${isLoading ? 'opacity-50' : ''}`}>
                        <TradingViewChart symbol={selectedSymbol} timeframe={timeframe} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card className="border-gray-800 bg-black/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-base">Market Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Market Cap</span>
                        <span>{marketOverview.totalMarketCap}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">24h Volume</span>
                        <span>{marketOverview.volume24h}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Dominance</span>
                        <span>{marketOverview.btcDominance}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-gray-800 bg-black/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-base">Top Signals</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="space-y-2 p-4 max-h-[280px] overflow-y-auto">
                        {latestSignals.length > 0 ? (
                          latestSignals.slice(0, 3).map((signal, idx) => (
                            <div
                              key={`${signal.symbol}-${idx}`}
                              className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                            >
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-2 ${signal.action === 'BUY' ? 'bg-green-500' :
                                  signal.action === 'SELL' ? 'bg-red-500' : 'bg-yellow-500'
                                  }`} />
                                <span className="font-medium">{signal.symbol}</span>
                              </div>
                              <div className="flex items-center">
                                <Badge className={
                                  signal.action === 'BUY' ? 'bg-green-500/20 text-green-500' :
                                    signal.action === 'SELL' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
                                }>
                                  {signal.action}
                                </Badge>
                                <span className="ml-2 text-sm">{(signal.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-gray-400">
                            No signals available yet
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <MarketIndices />

              <Card className="border-gray-800 bg-black/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Recent Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <VaultTable />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trading" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3">
                  <Card className="border-gray-800 bg-black/50 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Advanced Chart</CardTitle>
                        <p className="text-sm text-muted-foreground">{selectedSymbol}</p>
                      </div>
                      <TimeframeSelector
                        currentTimeframe={timeframe}
                        onTimeframeChange={handleTimeframeChange}
                      />
                    </CardHeader>
                    <CardContent>
                      <div className="h-[600px]">
                        <TradingViewChart symbol={selectedSymbol} timeframe={timeframe} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <StockInfo symbol={selectedSymbol} />

                  <Card className="border-gray-800 bg-black/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-base">Quick Trade</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Symbol</span>
                        <span className="font-medium">{selectedSymbol}</span>
                      </div>
                      <Input
                        type="number"
                        placeholder="Quantity"
                        className="bg-gray-800/50 text-white border-gray-700"
                      />
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Button variant="destructive" className="w-full">Sell</Button>
                        <Button className="w-full bg-green-600 hover:bg-green-700">Buy</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="mt-4">
              <MLAnalysisPanel
                symbols={trackedSymbols}
                onSignalReceived={handleSignalReceived}
              />
            </TabsContent>

            <TabsContent value="watchlist" className="mt-4">
              <Card className="border-gray-800 bg-black/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Watchlist</CardTitle>
                </CardHeader>
                <CardContent>
                  <WatchList
                    selectedSymbol={selectedSymbol}
                    onSelectSymbol={setSelectedSymbol}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
