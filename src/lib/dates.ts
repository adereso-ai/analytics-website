import {
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";
import type { DatePreset, DateRange, DateRangeMeta } from "./types";

/** GA4 del día en curso suele estar incompleto: cerramos en ayer por defecto. */
export function maxReliableEndDate(now = new Date()): Date {
  return subDays(now, 1);
}

export function toIsoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

export function resolveDateRange(params: {
  preset?: string | null;
  start?: string | null;
  end?: string | null;
  now?: Date;
}): DateRange {
  const now = params.now ?? new Date();
  const maxEnd = maxReliableEndDate(now);
  const preset = parsePreset(params.preset ?? null);

  if (preset === "custom") {
    let end = parseIsoDate(params.end) ?? maxEnd;
    let start = parseIsoDate(params.start) ?? subDays(end, 27);

    if (isAfter(end, maxEnd)) end = maxEnd;
    if (isAfter(start, end)) start = end;
    // Soft cap: 366 days to avoid accidental huge pulls
    if (differenceInCalendarDays(end, start) > 365) {
      start = subDays(end, 365);
    }

    return {
      preset: "custom",
      startDate: toIsoDate(start),
      endDate: toIsoDate(end),
      dayCount: differenceInCalendarDays(end, start) + 1,
    };
  }

  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 28;
  const end = maxEnd;
  const start = subDays(end, days - 1);

  return {
    preset,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    dayCount: days,
  };
}

export function previousPeriod(range: DateRange): {
  startDate: string;
  endDate: string;
  dayCount: number;
} {
  const start = parseISO(range.startDate);
  const end = parseISO(range.endDate);
  const length = differenceInCalendarDays(end, start) + 1;
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, length - 1);
  return {
    startDate: toIsoDate(prevStart),
    endDate: toIsoDate(prevEnd),
    dayCount: length,
  };
}

export function parsePreset(value: string | null): DatePreset {
  if (value === "7d" || value === "90d" || value === "28d" || value === "custom") {
    return value;
  }
  return "28d";
}

export function formatRangeLabel(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end)) return `${startDate} → ${endDate}`;

  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = format(start, sameYear ? "d MMM" : "d MMM yyyy", {
    locale: es,
  });
  const endFmt = format(end, "d MMM yyyy", { locale: es });
  return `${startFmt} – ${endFmt}`;
}

export function buildRangeMeta(
  range: DateRange,
  compare: ReturnType<typeof previousPeriod>,
): DateRangeMeta {
  return {
    label: formatRangeLabel(range.startDate, range.endDate),
    compareLabel: formatRangeLabel(compare.startDate, compare.endDate),
    excludesToday: true,
    note:
      "Los datos cierran en ayer para evitar el día en curso incompleto de GA4. Las cifras coinciden con la Data API (misma fuente que la UI de Analytics).",
  };
}

export function isDateInBounds(iso: string, maxEnd = maxReliableEndDate()): boolean {
  const d = parseIsoDate(iso);
  if (!d) return false;
  return !isAfter(d, maxEnd) && !isBefore(d, parseISO("2015-01-01"));
}
