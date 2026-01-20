"use client"

import * as React from "react"
import { Menu, X, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppHeaderProps {
  title?: string
  showMenu?: boolean
  showNotification?: boolean
  hasUnreadNotification?: boolean
  onMenuClick?: () => void
  onNotificationClick?: () => void
  className?: string
}

function SchoolLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-10", className)}
    >
      <rect width="40" height="40" rx="8" fill="#DC4545" />
      <path
        d="M20 8L8 16V32H32V16L20 8Z"
        fill="white"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="12" y="20" width="5" height="5" rx="0.5" fill="#DC4545" />
      <rect x="23" y="20" width="5" height="5" rx="0.5" fill="#DC4545" />
      <rect x="16" y="26" width="8" height="6" rx="0.5" fill="#DC4545" />
      <path
        d="M20 8L8 16H32L20 8Z"
        fill="white"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="14" r="2" fill="#DC4545" />
    </svg>
  )
}

function AppHeader({
  title,
  showMenu = true,
  showNotification = false,
  hasUnreadNotification = false,
  onMenuClick,
  onNotificationClick,
  className,
}: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen)
    onMenuClick?.()
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex items-center justify-between bg-background px-4 py-3",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <SchoolLogo />
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-tight text-primary">mijn</span>
          <span className="text-lg font-bold leading-tight text-primary">schoolkeuze</span>
        </div>
      </div>

      {title && (
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-foreground">
          {title}
        </h1>
      )}

      <div className="flex items-center gap-2">
        {showNotification && (
          <button
            type="button"
            onClick={onNotificationClick}
            className="relative flex size-10 items-center justify-center rounded-full transition-colors hover:bg-secondary"
          >
            <Bell className="size-5 text-foreground" />
            {hasUnreadNotification && (
              <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-primary" />
            )}
            <span className="sr-only">Notifications</span>
          </button>
        )}
        {showMenu && (
          <button
            type="button"
            onClick={handleMenuClick}
            className="relative flex size-10 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:bg-secondary"
          >
            {isMenuOpen ? (
              <X className="size-5 text-foreground" />
            ) : (
              <Menu className="size-5 text-foreground" />
            )}
            {hasUnreadNotification && !showNotification && (
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary" />
            )}
            <span className="sr-only">Menu</span>
          </button>
        )}
      </div>
    </header>
  )
}

export { AppHeader, SchoolLogo }
