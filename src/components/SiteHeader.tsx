import type { ReactNode } from "react"

import { ThemeToggle } from "@/components/ThemeToggle"

interface SiteHeaderProps {
  children?: ReactNode
}

export function SiteHeader({ children }: SiteHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-medium tracking-tight">VTT Janitor</h1>
        <ThemeToggle />
      </div>
      {children}
    </header>
  )
}
