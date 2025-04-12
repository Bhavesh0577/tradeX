import type React from "react"
import { cn } from "@/lib/utils"

interface DashboardShellProps {
  children: React.ReactNode
  className?: string
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-[220px_1fr]", className)}>
      <aside className="hidden w-[200px] flex-col md:flex">{/* Add Sidebar content here */}</aside>
      <main className="flex w-full flex-col overflow-hidden">
        <div className="container padding-4 py-6">{children}</div>
      </main>
    </div>
  )
}

