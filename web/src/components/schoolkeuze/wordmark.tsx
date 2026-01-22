"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
}

function Wordmark({ className }: WordmarkProps) {
  return (
    <Link href="/" className={cn("inline-flex self-start", className)}>
      <img
        src="/branding/mijnschoolkeuze_kit_v4/wordmark.png"
        alt="Mijn Schoolkeuze"
        className="h-9 w-auto object-contain"
      />
    </Link>
  );
}

export { Wordmark };
