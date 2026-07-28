import type { MetricDelta, OverviewStats } from "./types";

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${formatNumber(value * 100, digits)}%`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}m ${s}s`;
}

export function computeDelta(current: number, previous: number): MetricDelta {
  const abs = current - previous;
  if (previous === 0) {
    return {
      current,
      previous,
      abs,
      pct: current === 0 ? 0 : null,
    };
  }
  return {
    current,
    previous,
    abs,
    pct: abs / previous,
  };
}

export function overviewDeltas(
  current: OverviewStats,
  previous: OverviewStats,
) {
  return {
    activeUsers: computeDelta(current.activeUsers, previous.activeUsers),
    sessions: computeDelta(current.sessions, previous.sessions),
    screenPageViews: computeDelta(
      current.screenPageViews,
      previous.screenPageViews,
    ),
    keyEvents: computeDelta(current.keyEvents, previous.keyEvents),
    bounceRate: computeDelta(current.bounceRate, previous.bounceRate),
    averageSessionDuration: computeDelta(
      current.averageSessionDuration,
      previous.averageSessionDuration,
    ),
  };
}

export function formatDeltaPct(pct: number | null, digits = 1): string {
  if (pct === null) return "n/a";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${formatNumber(pct * 100, digits)}%`;
}

export function formatFetchedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
