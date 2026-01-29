export const badgeBase = "rounded-full border px-2 py-0.5 text-xs font-semibold";

export const badgeNeutral = `${badgeBase} text-muted-foreground`;

export const badgeStrong = "rounded-full border px-2 py-1 text-xs font-semibold";

export function fitBadgeClass(score: number) {
  if (score >= 80) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 60) return "border-lime-200 bg-lime-50 text-lime-700";
  if (score >= 40) return "border-amber-200 bg-amber-50 text-amber-700";
  if (score >= 20) return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-red-200 bg-red-50 text-red-700";
}
