"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const stickerChipVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        visited: "bg-progress-muted text-progress-foreground",
        planned: "bg-info-muted text-info",
        favourite: "bg-primary/10 text-primary",
        default: "bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type StickerChipVariant = "visited" | "planned" | "favourite" | "default"

interface StickerChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof stickerChipVariants> {
  showIcon?: boolean
}

const stickerIcons: Record<StickerChipVariant, string> = {
  visited: "✅",
  planned: "📅",
  favourite: "⭐",
  default: "",
}

const stickerLabels: Record<StickerChipVariant, string> = {
  visited: "Visited",
  planned: "Planned",
  favourite: "Favourite",
  default: "",
}

function StickerChip({
  className,
  variant = "default",
  showIcon = true,
  children,
  ...props
}: StickerChipProps) {
  const variantKey = variant as StickerChipVariant

  return (
    <span
      className={cn(stickerChipVariants({ variant }), className)}
      {...props}
    >
      {showIcon && stickerIcons[variantKey] && (
        <span className="text-sm">{stickerIcons[variantKey]}</span>
      )}
      {children || stickerLabels[variantKey]}
    </span>
  )
}

export { StickerChip, stickerChipVariants, type StickerChipVariant }
