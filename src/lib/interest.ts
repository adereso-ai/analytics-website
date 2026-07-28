import type { InterestLevel, LandingInterestRow } from "./types";

/** Paths que no son landings comerciales (ruido legal / gracias). */
const EXCLUDED_PATH_RE =
  /thank-you|gracias|politica|privacidad|terminos|aviso-de-privacidad|internal-signup/i;

/**
 * Nota 0–100 = suma de 5 aportes sacados de GA4.
 *
 * Fuentes:
 * 1. engagementPts (0–25) ← engagedSessions / sessions
 * 2. bouncePts (0–15) ← 1 − bounceRate
 * 3. timePts (0–15) ← averageSessionDuration / 120s
 * 4. formPts (0–25) ← (form_start users / users), tope 25%
 * 5. conversionPts (0–25) ← (conv users / users), tope 8%
 *    conv = HubSpot en esa página, o thank-you (get / contacto)
 *
 * Prioridad (aparte): nota × √(users / maxUsers del listado).
 */
export function scoreLandingInterest(input: {
  users: number;
  sessions: number;
  engagedSessions: number;
  bounceRate: number;
  avgSessionDuration: number;
  formStartUsers: number;
  conversionUsers: number;
}): Pick<
  LandingInterestRow,
  | "engagementRate"
  | "formStartRate"
  | "conversionRate"
  | "score"
  | "scoreParts"
  | "level"
  | "levelLabel"
  | "reasons"
> {
  const users = Math.max(0, input.users);
  const sessions = Math.max(0, input.sessions);
  const engagementRate =
    sessions > 0 ? input.engagedSessions / sessions : 0;
  const formStartRate = users > 0 ? input.formStartUsers / users : 0;
  const conversionRate = users > 0 ? input.conversionUsers / users : 0;
  const bounceHealth = Math.max(0, Math.min(1, 1 - input.bounceRate));
  const durationScore = Math.min(
    Math.max(0, input.avgSessionDuration) / 120,
    1,
  );
  const formScore = Math.min(formStartRate / 0.25, 1);
  const convScore = Math.min(conversionRate / 0.08, 1);

  const scoreParts = {
    engagementPts: Math.round(25 * engagementRate),
    bouncePts: Math.round(15 * bounceHealth),
    timePts: Math.round(15 * durationScore),
    formPts: Math.round(25 * formScore),
    conversionPts: Math.round(25 * convScore),
  };

  const score = Math.min(
    100,
    scoreParts.engagementPts +
      scoreParts.bouncePts +
      scoreParts.timePts +
      scoreParts.formPts +
      scoreParts.conversionPts,
  );

  const reasons: string[] = [];
  if (input.conversionUsers > 0) {
    reasons.push("Hay conversiones (envío / thank-you)");
  }
  if (formStartRate >= 0.1) {
    reasons.push("Muchos usuarios empiezan el form");
  } else if (formStartRate > 0) {
    reasons.push("Algunos empiezan el form");
  }
  if (engagementRate >= 0.55) {
    reasons.push("Buen engagement de sesión");
  }
  if (input.bounceRate <= 0.25) {
    reasons.push("Rebote bajo");
  }
  if (input.avgSessionDuration >= 90) {
    reasons.push("Tiempo en página alto");
  }
  if (input.bounceRate >= 0.45 && engagementRate < 0.45) {
    reasons.push("Tráfico frío (rebote alto, poco engagement)");
  }
  if (reasons.length === 0) {
    reasons.push("Sin señales fuertes de intención");
  }

  let level: InterestLevel = "low";
  if (
    input.conversionUsers > 0 ||
    formStartRate >= 0.1 ||
    score >= 55
  ) {
    level = "high";
  } else if (score >= 35 || engagementRate >= 0.55) {
    level = "medium";
  }

  const levelLabel =
    level === "high"
      ? "Alta intención"
      : level === "medium"
        ? "Interés medio"
        : "Bajo interés";

  return {
    engagementRate,
    formStartRate,
    conversionRate,
    score,
    scoreParts,
    level,
    levelLabel,
    reasons,
  };
}

/**
 * Prioridad 0–100 = interés × volumen relativo.
 * volumeFactor = √(users / maxUsers) para que el tráfico no aplaste
 * páginas medianas, pero sí baje las de muy poca visita.
 */
export function scoreLandingPriority(
  score: number,
  users: number,
  maxUsers: number,
): Pick<
  LandingInterestRow,
  "priority" | "priorityLevel" | "priorityLabel"
> {
  const volumeShare =
    maxUsers > 0 ? Math.min(1, Math.max(0, users) / maxUsers) : 0;
  const volumeFactor = Math.sqrt(volumeShare);
  const priority = Math.min(100, Math.round(Math.max(0, score) * volumeFactor));

  let priorityLevel: InterestLevel = "low";
  if (priority >= 40) priorityLevel = "high";
  else if (priority >= 18) priorityLevel = "medium";

  const priorityLabel =
    priorityLevel === "high"
      ? "Alta prioridad"
      : priorityLevel === "medium"
        ? "Prioridad media"
        : "Baja prioridad";

  return { priority, priorityLevel, priorityLabel };
}

export function isInterestCandidatePath(pagePath: string): boolean {
  const path = pagePath || "/";
  if (EXCLUDED_PATH_RE.test(path)) return false;
  return true;
}
