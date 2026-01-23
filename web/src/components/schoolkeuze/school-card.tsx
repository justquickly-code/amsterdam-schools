"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function InfoCard({ title, action, children, className }: InfoCardProps) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-card-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export { InfoCard };
