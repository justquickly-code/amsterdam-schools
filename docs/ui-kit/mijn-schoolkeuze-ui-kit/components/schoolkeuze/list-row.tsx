"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { StickerChip, type StickerChipVariant } from "./sticker-chip"

interface ListRowProps {
  title: string
  subtitle?: string
  value?: string
  stickers?: StickerChipVariant[]
  icon?: React.ReactNode
  showArrow?: boolean
  onClick?: () => void
  className?: string
}

function ListRow({
  title,
  subtitle,
  value,
  stickers,
  icon,
  showArrow = false,
  onClick,
  className,
}: ListRowProps) {
  const Component = onClick ? "button" : "div"

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 py-3 text-left transition-colors",
        onClick && "cursor-pointer hover:bg-secondary/50 active:bg-secondary -mx-4 px-4 rounded-lg",
        className
      )}
    >
      {icon && (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-card-foreground">{title}</span>
          {stickers && stickers.length > 0 && (
            <div className="flex gap-1">
              {stickers.map((variant) => (
                <StickerChip key={variant} variant={variant} />
              ))}
            </div>
          )}
        </div>
        {subtitle && (
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        )}
      </div>
      {value && (
        <span className="shrink-0 text-sm text-muted-foreground">{value}</span>
      )}
      {showArrow && (
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      )}
    </Component>
  )
}

interface ListGroupProps {
  title?: string
  children: React.ReactNode
  dividers?: boolean
  className?: string
}

function ListGroup({ title, children, dividers = true, className }: ListGroupProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {title && (
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
      )}
      <div
        className={cn(
          "flex flex-col",
          dividers && "[&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-border"
        )}
      >
        {children}
      </div>
    </div>
  )
}

export { ListRow, ListGroup }
