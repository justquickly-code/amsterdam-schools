"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressCardProps {
  title?: string;
  progress: number;
  totalSteps?: number;
  completedSteps?: number;
  message?: string;
  recentActivity?: string;
  className?: string;
}

function ProgressCard({
  title = "Progress",
  progress,
  totalSteps = 7,
  completedSteps,
  message,
  recentActivity,
  className,
}: ProgressCardProps) {
  const calculatedCompletedSteps = completedSteps ?? Math.round((progress / 100) * totalSteps);

  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-card-foreground">{title}</h3>
        <span className="text-sm text-muted-foreground">{progress}% complete</span>
      </div>

      <div className="flex gap-1.5 text-xl leading-none">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < calculatedCompletedSteps;
          return (
            <span
              key={index}
              className={cn(
                "transition-colors",
                isCompleted ? "text-progress" : "text-progress/30"
              )}
              aria-hidden="true"
            >
              ★
            </span>
          );
        })}
      </div>

      {message && <p className="text-sm font-medium text-card-foreground">{message}</p>}

      {recentActivity && (
        <p className="text-sm text-muted-foreground">Recently: {recentActivity}</p>
      )}
    </div>
  );
}

export { ProgressCard };
