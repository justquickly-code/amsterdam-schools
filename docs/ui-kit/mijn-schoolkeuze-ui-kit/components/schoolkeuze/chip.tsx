"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        primary: "bg-primary text-primary-foreground",
        info: "bg-info-muted text-info",
        progress: "bg-progress-muted text-progress-foreground",
        outline: "border border-border bg-transparent text-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  onRemove?: () => void
  removable?: boolean
}

function Chip({
  className,
  variant,
  size,
  onRemove,
  removable = false,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(chipVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-foreground/10"
        >
          <X className="size-3" />
          <span className="sr-only">Remove</span>
        </button>
      )}
    </span>
  )
}

interface ChipGroupProps {
  children: React.ReactNode
  className?: string
}

function ChipGroup({ children, className }: ChipGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  )
}

export { Chip, ChipGroup, chipVariants }
