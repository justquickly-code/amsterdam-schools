"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  imageClassName?: string;
  variant?: "default" | "white";
}

function Wordmark({ className, imageClassName, variant = "default" }: WordmarkProps) {
  const src =
    variant === "white"
      ? "/branding/mijnschoolkeuze_kit_v4/wordmark_white_text_transparent.png"
      : "/branding/mijnschoolkeuze_kit_v4/wordmark.png";
  return (
    <Link href="/" className={cn("inline-flex self-start", className)}>
      <Image
        src={src}
        alt="Mijn Schoolkeuze"
        width={180}
        height={36}
        className={cn("h-9 w-auto object-contain", imageClassName)}
        style={{ width: "auto", height: "auto" }}
        priority
      />
    </Link>
  );
}

export { Wordmark };
