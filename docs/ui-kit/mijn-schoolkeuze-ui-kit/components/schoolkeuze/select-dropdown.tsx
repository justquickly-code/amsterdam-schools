"use client"

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectDropdownProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
}

function SelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  disabled = false,
  className,
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left text-base transition-all",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isOpen && "border-primary ring-2 ring-primary/20"
          )}
        >
          <span className={cn(!selectedOption && "text-muted-foreground")}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={cn(
              "size-5 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => !option.disabled && handleSelect(option.value)}
                disabled={option.disabled}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-3 text-left text-base transition-colors",
                  "hover:bg-secondary",
                  option.disabled && "cursor-not-allowed opacity-50",
                  option.value === value && "bg-secondary"
                )}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check className="size-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { SelectDropdown, type SelectOption }
