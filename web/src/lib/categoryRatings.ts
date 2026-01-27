"use client";

export const CATEGORY_KEYS = [
  "atmosphere",
  "sciences",
  "arts",
  "languages",
  "facilities",
  "teachers_students",
  "unique_offerings",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const RATING_EMOJIS = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😐" },
  { value: 3, emoji: "🙂" },
  { value: 4, emoji: "😀" },
  { value: 5, emoji: "🤩" },
] as const;

export function computeFitPercent(values: Array<number | null | undefined>) {
  const rated = values.filter((v): v is number => typeof v === "number" && v > 0);
  if (rated.length === 0) return null;
  const avg = rated.reduce((sum, v) => sum + v, 0) / rated.length;
  return Math.round((avg / 5) * 100);
}
