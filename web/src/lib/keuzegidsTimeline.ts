export type TimelineItem = {
  id: string;
  start: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD
  titleKey: string;
  bodyKey: string;
};

export const KEUZEGIDS_TIMELINE_2025_26: TimelineItem[] = [
  {
    id: "provisional_advice",
    start: "2026-01-01",
    end: "2026-01-31",
    titleKey: "how.title_provisional",
    bodyKey: "how.body_provisional",
  },
  {
    id: "orientation",
    start: "2025-11-17",
    end: "2026-02-13",
    titleKey: "how.title_orientation",
    bodyKey: "how.body_orientation",
  },
  {
    id: "doorstroomtoets",
    start: "2026-02-02",
    end: "2026-02-06",
    titleKey: "how.title_doorstroom",
    bodyKey: "how.body_doorstroom",
  },
  {
    id: "definitive_advice",
    start: "2026-03-24",
    end: "2026-03-24",
    titleKey: "how.title_definitive",
    bodyKey: "how.body_definitive",
  },
  {
    id: "central_apply",
    start: "2026-03-25",
    end: "2026-03-31",
    titleKey: "how.title_apply",
    bodyKey: "how.body_apply",
  },
  {
    id: "placement",
    start: "2026-04-09",
    end: "2026-04-09",
    titleKey: "how.title_placement",
    bodyKey: "how.body_placement",
  },
  {
    id: "second_round",
    start: "2026-04-09",
    end: "2026-04-14",
    titleKey: "how.title_second_round",
    bodyKey: "how.body_second_round",
  },
  {
    id: "meet_school",
    start: "2026-06-23",
    end: "2026-06-24",
    titleKey: "how.title_meet",
    bodyKey: "how.body_meet",
  },
];

function asDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function getNextTimelineItems(now: Date, count = 2) {
  const items = [...KEUZEGIDS_TIMELINE_2025_26].sort((a, b) =>
    asDate(a.start).getTime() - asDate(b.start).getTime()
  );

  const currentOrUpcoming = items.filter((item) => {
    const end = asDate(item.end ?? item.start).getTime();
    const ts = now.getTime();
    return ts <= end;
  });

  return currentOrUpcoming.slice(0, count);
}

export function formatDateRange(item: TimelineItem, locale: string) {
  const start = asDate(item.start);
  const end = asDate(item.end ?? item.start);
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

  const startText = start.toLocaleDateString(locale, options);
  const endText = end.toLocaleDateString(locale, options);

  if (start.toDateString() === end.toDateString()) return startText;
  return `${startText}–${endText}`;
}
