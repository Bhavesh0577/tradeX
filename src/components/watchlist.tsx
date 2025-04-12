import { ArrowDown, ArrowUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

const watchlistData = [
  { symbol: "SPX", name: "S&P 500", price: "6,131.0", change: "+1.46", changePercent: "+0.02%" },
  { symbol: "NDC", name: "NASDAQ", price: "22,163", change: "-0.80", changePercent: "-0.00%" },
  { symbol: "DJI", name: "Dow Jones", price: "44,411", change: "-145.1", changePercent: "-0.33%" },
  { symbol: "TSL", name: "Tesla", price: "361.88", change: "+7.77", changePercent: "+2.19%" },
  // Add more stocks
]

export function Watchlist() {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Watchlist</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {watchlistData.map((stock) => (
            <div
              key={stock.symbol}
              className="mb-4 flex items-center justify-between border-b border-border/40 pb-4 last:mb-0 last:border-0 last:pb-0"
            >
              <div>
                <div className="font-medium">{stock.symbol}</div>
                <div className="text-sm text-muted-foreground">{stock.name}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{stock.price}</div>
                <div
                  className={
                    stock.change.startsWith("+")
                      ? "flex items-center text-sm text-green-500"
                      : "flex items-center text-sm text-red-500"
                  }
                >
                  {stock.change.startsWith("+") ? (
                    <ArrowUp className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDown className="mr-1 h-3 w-3" />
                  )}
                  {stock.change} ({stock.changePercent})
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

