export const LEVEL_LABELS: Record<string, string> = {
  vwo: "VWO",
  havo: "HAVO",
  "vmbo-tl": "VMBO-TL (mavo)",
  "vmbo-gl": "VMBO-GL",
  "vmbo-kb": "VMBO-KB",
  "vmbo-bb": "VMBO-BB",
  praktijkonderwijs: "Praktijkonderwijs",
};

export function friendlyLevel(label: string) {
  const key = (label ?? "").toLowerCase().trim();
  return LEVEL_LABELS[key] ?? label;
}
