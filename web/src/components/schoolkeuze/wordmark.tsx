"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
}

function Wordmark({ className }: WordmarkProps) {
  return (
    <img
      src="/branding/mijnschoolkeuze_kit_v4/wordmark.png"
      alt="Mijn Schoolkeuze"
      className={cn("h-9 w-auto self-start object-contain", className)}
    />
  );
}

export { Wordmark };
