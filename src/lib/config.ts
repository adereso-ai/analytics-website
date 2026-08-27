import type { FunnelStepConfig } from "./types";

export type GaCredentials =
  | { kind: "json"; json: string }
  | { kind: "fields"; clientEmail: string; privateKey: string }
  | { kind: "file"; path: string };

export function getPropertyId(): string | null {
  const id = process.env.GA4_PROPERTY_ID?.trim();
  return id || null;
}

/** Propiedad de Cassper; el measurement ID asociado es G-RCMTVJ8444. */
export function getCassperPropertyId(): string | null {
  const id = process.env.CASSPER_GA4_PROPERTY_ID?.trim();
  return id || null;
}

export function getCredentials(): GaCredentials | null {
  const json = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
  if (json) return { kind: "json", json };

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (clientEmail && privateKey) {
    return { kind: "fields", clientEmail, privateKey };
  }

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (path) return { kind: "file", path };

  return null;
}

export function isGaConfigured(): boolean {
  return Boolean(getPropertyId() && getCredentials());
}

const MAIN_HOSTS = ["adereso.ai", "www.adereso.ai"];

/** Home → Contacto → Thank-you (sitio principal). */
export const CONVERSION_FUNNEL_STEPS: FunnelStepConfig[] = [
  { name: "Home", hostNames: MAIN_HOSTS, pagePath: "/" },
  { name: "Contacto", hostNames: MAIN_HOSTS, pagePath: "/contacto" },
  { name: "Thank-you", hostNames: MAIN_HOSTS, pagePath: "/thank-you-page" },
];

/** Home → Pricing; next actions muestran a dónde fueron después. */
export const INTEREST_FUNNEL_STEPS: FunnelStepConfig[] = [
  { name: "Home", hostNames: MAIN_HOSTS, pagePath: "/" },
  { name: "Pricing", hostNames: MAIN_HOSTS, pagePath: "/pricing" },
];

/**
 * Embudo de conversión. Si existe GA4_FUNNEL_STEPS en env, lo usa
 * (override avanzado); si no, el default Home → Contacto → Thank-you.
 */
export function getFunnelSteps(): FunnelStepConfig[] {
  const raw = process.env.GA4_FUNNEL_STEPS?.trim();
  if (!raw) return CONVERSION_FUNNEL_STEPS;

  try {
    const parsed = JSON.parse(raw) as FunnelStepConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return CONVERSION_FUNNEL_STEPS;
    }
    return parsed;
  } catch {
    return CONVERSION_FUNNEL_STEPS;
  }
}

export function getInterestFunnelSteps(): FunnelStepConfig[] {
  return INTEREST_FUNNEL_STEPS;
}
