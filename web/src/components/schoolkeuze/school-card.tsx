"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
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

interface SchoolCardProps {
  name: string;
  href: string;
  imageUrl?: string | null;
  subtitle?: string | null;
  badges?: React.ReactNode;
  tags?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

function SchoolCard({
  name,
  href,
  imageUrl,
  subtitle,
  badges,
  tags,
  meta,
  action,
  className,
  children,
}: SchoolCardProps) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-3xl border bg-card shadow-md", className)}>
      {imageUrl ? (
        <div className="relative h-40">
          <Link href={href} className="absolute inset-0">
            <Image src={imageUrl} alt={name} fill className="object-cover" />
          </Link>
          {action}
        </div>
      ) : null}
      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <Link className="text-base font-semibold text-primary underline underline-offset-2" href={href}>
            {name}
          </Link>
          {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
        </div>
        {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
        {tags ? <div className="flex flex-wrap gap-2">{tags}</div> : null}
        {meta ? <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">{meta}</div> : null}
        {children}
      </div>
    </div>
  );
}

export { InfoCard, SchoolCard };
