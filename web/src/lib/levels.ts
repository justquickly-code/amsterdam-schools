export const LEVEL_LABELS: Record<string, string> = {
  vwo: "VWO",
  havo: "HAVO",
  "vmbo-tl": "VMBO-TL (mavo)",
  "vmbo-gl": "VMBO-GL",
  "vmbo-kb": "VMBO-KB",
  "vmbo-bb": "VMBO-BB",
  praktijkonderwijs: "Praktijkonderwijs",
};

export const LEVEL_OPTIONS = Object.entries(LEVEL_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export type AdviesOption = {
  key: string;
  label: string;
  levels: string[];
};

export const ADVIES_OPTIONS: AdviesOption[] = [
  { key: "vwo", label: "VWO", levels: ["vwo"] },
  { key: "havo-vwo", label: "HAVO/VWO", levels: ["havo", "vwo"] },
  { key: "havo", label: "HAVO", levels: ["havo"] },
  { key: "vmbo-tl-havo", label: "VMBO-tl/HAVO", levels: ["vmbo-tl", "havo"] },
  { key: "vmbo-tl", label: "VMBO-tl", levels: ["vmbo-tl"] },
  { key: "vmbo-gl-tl", label: "VMBO-gl/VMBO-tl", levels: ["vmbo-gl", "vmbo-tl"] },
  { key: "vmbo-gl", label: "VMBO-gl", levels: ["vmbo-gl"] },
  { key: "vmbo-kb-gl", label: "VMBO-k/VMBO-gl", levels: ["vmbo-kb", "vmbo-gl"] },
  { key: "vmbo-kb", label: "VMBO-k", levels: ["vmbo-kb"] },
  { key: "vmbo-bb", label: "VMBO-b", levels: ["vmbo-bb"] },
];

export function adviesOptionFromLevels(levels: string[]) {
  const sorted = [...(levels ?? [])].map((l) => l.toLowerCase().trim()).sort();
  if (sorted.length === 0) return "";
  const match = ADVIES_OPTIONS.find((opt) => {
    const optLevels = [...opt.levels].map((l) => l.toLowerCase().trim()).sort();
    if (optLevels.length !== sorted.length) return false;
    return optLevels.every((l, i) => l === sorted[i]);
  });
  return match?.key ?? "";
}

const SHORTLIST_CAP_BY_OPTION: Record<string, number> = {
  "vwo": 12,
  "havo-vwo": 12,
  "havo": 12,
  "vmbo-tl-havo": 6,
  "vmbo-tl": 6,
  "vmbo-gl-tl": 6,
  "vmbo-gl": 6,
  "vmbo-kb-gl": 4,
  "vmbo-kb": 4,
  "vmbo-bb": 4,
};

export function shortlistRankCapForLevels(levels: string[]) {
  const key = adviesOptionFromLevels(levels ?? []);
  return SHORTLIST_CAP_BY_OPTION[key] ?? 12;
}

export function friendlyLevel(label: string) {
  const key = (label ?? "").toLowerCase().trim();
  return LEVEL_LABELS[key] ?? label;
}
