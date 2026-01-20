"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Info, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const calloutVariants = cva(
  "flex gap-3 rounded-xl p-4 text-sm",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        info: "bg-info-muted text-info",
        success: "bg-progress-muted text-progress-foreground",
        warning: "bg-primary/10 text-primary",
        error: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const calloutIcons = {
  default: Info,
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
}

interface CalloutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {
  title?: string
  icon?: React.ReactNode
  showIcon?: boolean
}

function Callout({
  className,
  variant = "default",
  title,
  icon,
  showIcon = true,
  children,
  ...props
}: CalloutProps) {
  const Icon = calloutIcons[variant || "default"]

  return (
    <div
      role="alert"
      className={cn(calloutVariants({ variant }), className)}
      {...props}
    >
      {showIcon && (
        <div className="shrink-0">
          {icon || <Icon className="size-5" />}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  )
}

export { Callout, calloutVariants }
