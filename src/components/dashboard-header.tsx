import { Bell, LineChart, Maximize2, Settings } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center space-x-2">
            <LineChart className="h-6 w-6" />
            <span className="font-bold">TradingDash</span>
          </Link>
          <Select defaultValue="5m">
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="Interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1m</SelectItem>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="1d">1D</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}

