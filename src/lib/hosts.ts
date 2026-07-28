/** Hosts que no queremos en la analítica de producto. */
const BLOCKED_EXACT = new Set(
  ["localhost", "cms.adereso.ai"].map((h) => h.toLowerCase()),
);

const BLOCKED_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.localhost$/i,
  /^cms\.adereso\.ai$/i,
  /hosted\.app$/i,
  /vercel\.app$/i,
  /translate\.goog$/i,
];

/** Hosts de producto que sí mantenemos visibles. */
export const PRODUCT_HOSTS = [
  "adereso.ai",
  "www.adereso.ai",
  "get.adereso.ai",
  "lp.adereso.ai",
  "vsl.adereso.ai",
] as const;

export function isBlockedHost(hostName: string | undefined | null): boolean {
  if (!hostName) return true;
  const host = hostName.trim().toLowerCase();
  if (!host) return true;
  if (BLOCKED_EXACT.has(host)) return true;
  return BLOCKED_PATTERNS.some((re) => re.test(host));
}

export function isAllowedHost(hostName: string | undefined | null): boolean {
  return !isBlockedHost(hostName);
}

export function filterRowsByHost<
  T extends { dimensions: Record<string, string> },
>(rows: T[], hostKey = "hostName"): T[] {
  return rows.filter((row) => isAllowedHost(row.dimensions[hostKey]));
}
