"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SchoolCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  titleHref?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

function SchoolCard({
  title,
  subtitle,
  description,
  titleHref,
  children,
  onClick,
  className,
}: SchoolCardProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-3 rounded-3xl border bg-card/95 p-5 text-left shadow-md shadow-black/5 transition-shadow",
        onClick && "cursor-pointer hover:shadow-md active:shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-card-foreground">
          {titleHref ? (
            <Link className="text-primary underline underline-offset-2 hover:decoration-2" href={titleHref}>
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children}
    </Component>
  );
}

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

export { SchoolCard, InfoCard };
