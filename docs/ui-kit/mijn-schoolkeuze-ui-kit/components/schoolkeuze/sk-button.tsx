"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const skButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-border",
        tertiary:
          "bg-transparent text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/50",
        outline:
          "border-2 border-border bg-transparent text-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-border",
        ghost:
          "bg-transparent text-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-border",
        info:
          "bg-info text-info-foreground hover:bg-info/90 focus-visible:ring-2 focus-visible:ring-info/50",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-13 px-6 text-lg",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-13",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
)

interface SKButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof skButtonVariants> {
  asChild?: boolean
}

function SKButton({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  ...props
}: SKButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      className={cn(skButtonVariants({ variant, size, fullWidth, className }))}
      {...props}
    />
  )
}

export { SKButton, skButtonVariants }
