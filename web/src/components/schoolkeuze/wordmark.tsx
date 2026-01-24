"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
}

function Wordmark({ className }: WordmarkProps) {
  return (
    <Link href="/" className={cn("inline-flex self-start", className)}>
      <Image
        src="/branding/mijnschoolkeuze_kit_v4/wordmark.png"
        alt="Mijn Schoolkeuze"
        width={180}
        height={36}
        className="h-9 w-auto object-contain"
        style={{ width: "auto", height: "auto" }}
        priority
      />
    </Link>
  );
}

export { Wordmark };
