"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { StickerChip, type StickerChipVariant } from "./sticker-chip"

interface SchoolCardProps {
  title: string
  subtitle?: string
  description?: string
  stickers?: StickerChipVariant[]
  children?: React.ReactNode
  onClick?: () => void
  className?: string
}

function SchoolCard({
  title,
  subtitle,
  description,
  stickers,
  children,
  onClick,
  className,
}: SchoolCardProps) {
  const Component = onClick ? "button" : "div"
  
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-shadow",
        onClick && "cursor-pointer hover:shadow-md active:shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-card-foreground">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {stickers && stickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {stickers.map((variant) => (
              <StickerChip key={variant} variant={variant} />
            ))}
          </div>
        )}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
    </Component>
  )
}

interface InfoCardProps {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

function InfoCard({ title, action, children, className }: InfoCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-card-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export { SchoolCard, InfoCard }
