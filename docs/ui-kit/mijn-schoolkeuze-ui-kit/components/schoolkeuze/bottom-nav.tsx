"use client"

import * as React from "react"
import { LayoutDashboard, School, Calendar, Star } from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
}

const defaultNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-5" /> },
  { id: "schools", label: "Schools", icon: <School className="size-5" /> },
  { id: "open-days", label: "Open days", icon: <Calendar className="size-5" /> },
  { id: "shortlist", label: "Shortlist", icon: <Star className="size-5" /> },
]

interface BottomNavProps {
  items?: NavItem[]
  activeId?: string
  onNavigate?: (id: string) => void
  className?: string
}

function BottomNav({
  items = defaultNavItems,
  activeId = "dashboard",
  onNavigate,
  className,
}: BottomNavProps) {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-2 pb-safe",
        className
      )}
    >
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const isActive = item.id === activeId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export { BottomNav, type NavItem }
