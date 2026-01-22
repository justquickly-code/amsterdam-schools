"use client"

import { Home, Search, Heart, Calendar, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface JourneyProgressProps {
  currentStep: number
  schoolsDiscovered: number
  shortlistCount: number
}

const steps = [
  { icon: Home, label: "Start", shortLabel: "Start" },
  { icon: Search, label: "Ontdekken", shortLabel: "Ontdek" },
  { icon: Heart, label: "Shortlist", shortLabel: "Lijst" },
  { icon: Calendar, label: "Open Dagen", shortLabel: "Dagen" },
  { icon: CheckCircle2, label: "Keuze", shortLabel: "Keuze" },
]

export function JourneyProgress({ currentStep, schoolsDiscovered, shortlistCount }: JourneyProgressProps) {
  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm">
      {/* Progress message */}
      <p className="text-center text-sm text-muted-foreground mb-4">
        {currentStep === 1 && `Je hebt ${schoolsDiscovered} scholen ontdekt!`}
        {currentStep === 2 && `${shortlistCount} ${shortlistCount === 1 ? "school" : "scholen"} op je lijst`}
        {currentStep === 3 && "Plan je open dagen"}
        {currentStep === 4 && "Maak je keuze"}
      </p>

      {/* Progress steps */}
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isComplete = index < currentStep
            const isCurrent = index === currentStep
            const isUpcoming = index > currentStep

            return (
              <div key={step.label} className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    isComplete && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isUpcoming && "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium",
                    isComplete && "text-primary",
                    isCurrent && "text-primary",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step.shortLabel}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
