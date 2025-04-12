import { Button } from "@/components/custom-button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChartUI } from "@/components/chart-ui"
import { VaultTable } from "@/components/vault-table"
import { BarChart3, ChevronDown, Globe, Home, LayoutDashboard, LifeBuoy, Search, Settings, Wallet, LogOut } from "lucide-react"
import '../app/globals.css'
import { useState, useEffect } from "react"
import { useUser, UserButton, SignOutButton } from "@clerk/nextjs"
import { useRouter } from "next/router"

export default function Page() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC-USD");
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
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid lg:grid-cols-[280px_1fr]">
        <aside className="border-r bg-background/50 backdrop-blur">
          <div className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              <span className="font-bold">Vaultify</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => router.push('/profile')}
              >
                Profile
              </Button>
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
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

          </div>
          <nav className="space-y-2 px-2">
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => window.location.href = '/trade'}>
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => window.location.href = 'https://www.tradingview.com/chart/8daX0FdT/'}>
              <BarChart3 className="h-4 w-4" />
              Intraday Strategy
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Globe className="h-4 w-4" />
              Market
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Home className="h-4 w-4" />
              Funding
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Wallet className="h-4 w-4" />
              Yield Vaults
              <ChevronDown className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <LifeBuoy className="h-4 w-4" />
              Support
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
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
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <div className="flex items-center">
            <h1 className="font-semibold text-lg md:text-2xl">Dashboard</h1>
            {user && (
              <p className="ml-4 text-sm text-gray-400">
                Welcome, {user.firstName || user.username || 'User'}!
              </p>
            )}
          </div>
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Overview</h1>
              <div className="text-sm text-muted-foreground">
                {isSearching ? "Searching..." : `Currently viewing: ${selectedSymbol}`}
              </div>
            </div>
            {/* <Button variant="outline" className="gap-2">
              Ethereum Network
              <ChevronDown className="h-4 w-4" />
            </Button> */}
          </div>
          {/* <div className="grid gap-4 md:grid-cols-3">
            <MetricsCard
              title="Your Balance"
              value="$74,892"
              change={{ value: "$1,340", percentage: "-2.1%", isPositive: false }}
            />
            <MetricsCard
              title="Your Deposits"
              value="$54,892"
              change={{ value: "$1,340", percentage: "+13.2%", isPositive: true }}
            />
            <MetricsCard
              title="Accrued Yield"
              value="$20,892"
              change={{ value: "$1,340", percentage: "+1.2%", isPositive: true }}
            />
          </div> */}
          <Card className="mt-6 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Market Chart
              </h2>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost">
                  Today
                </Button>
                <Button size="sm" variant="ghost">
                  Last week
                </Button>
                <Button size="sm" variant="ghost">
                  Last month
                </Button>
                <Button size="sm" variant="ghost">
                  Last 6 month
                </Button>
                <Button size="sm" variant="ghost">
                  Year
                </Button>
              </div>
            </div>
            <ChartUI symbol={selectedSymbol} />
          </Card>
          <div className="mt-6">
            <VaultTable />
          </div>
        </main>
      </div>
    </div>
  )
}

