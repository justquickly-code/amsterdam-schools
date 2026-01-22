"use client"

import Link from "next/link"
import { Search, Heart, Calendar, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  activeTab: "discover" | "favorites" | "calendar" | "profile"
  favoritesCount?: number
}

const tabs = [
  { id: "discover", icon: Search, label: "Ontdek", href: "/" },
  { id: "favorites", icon: Heart, label: "Mijn Lijst", href: "/favorites" },
  { id: "calendar", icon: Calendar, label: "Open Dagen", href: "/calendar" },
  { id: "profile", icon: User, label: "Profiel", href: "/profile" },
] as const

export function BottomNav({ activeTab, favoritesCount = 0 }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === activeTab
          const showBadge = tab.id === "favorites" && favoritesCount > 0

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full relative transition-colors min-w-[64px]",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-6 h-6", isActive && "fill-primary/10")} />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {favoritesCount > 9 ? "9+" : favoritesCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-xs mt-1 font-medium",
                isActive && "text-primary"
              )}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
