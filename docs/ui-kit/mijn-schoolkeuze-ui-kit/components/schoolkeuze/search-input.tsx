"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void
}

function SearchInput({
  className,
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  ...props
}: SearchInputProps) {
  const hasValue = value && String(value).length > 0

  const handleClear = () => {
    onClear?.()
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "h-12 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-base text-foreground placeholder:text-muted-foreground",
          "transition-all outline-none",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        {...props}
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </div>
  )
}

export { SearchInput }
