"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle, Info, AlertCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const toastVariants = cva(
  "flex items-start gap-3 rounded-xl p-4 shadow-lg border animate-in slide-in-from-top-2 fade-in duration-200",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        success: "bg-progress-muted text-progress-foreground border-progress/30",
        info: "bg-info-muted text-info border-info/30",
        warning: "bg-primary/10 text-primary border-primary/30",
        error: "bg-destructive/10 text-destructive border-destructive/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const toastIcons = {
  default: Info,
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
}

interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string
  description?: string
  onClose?: () => void
  showIcon?: boolean
}

function Toast({
  className,
  variant = "default",
  title,
  description,
  onClose,
  showIcon = true,
  children,
  ...props
}: ToastProps) {
  const Icon = toastIcons[variant || "default"]

  return (
    <div
      role="alert"
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {showIcon && <Icon className="mt-0.5 size-5 shrink-0" />}
      <div className="flex flex-1 flex-col gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {description && <p className="text-sm opacity-90">{description}</p>}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 transition-colors hover:bg-foreground/10"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  )
}

interface ToastContainerProps {
  children: React.ReactNode
  position?: "top" | "bottom"
  className?: string
}

function ToastContainer({
  children,
  position = "top",
  className,
}: ToastContainerProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-[100] mx-auto flex w-full max-w-md flex-col gap-2 px-4",
        position === "top" ? "top-4" : "bottom-20",
        className
      )}
    >
      {children}
    </div>
  )
}

export { Toast, ToastContainer, toastVariants }
