/**
 * Detecta tráfico desde buscadores / asistentes de IA (ChatGPT, Perplexity, etc.).
 * GA4 a veces lo marca como "AI Assistant"; otras como Referral / Unassigned.
 */

const AI_SOURCE_PATTERNS: RegExp[] = [
  /chatgpt/i,
  /openai\.com/i,
  /perplexity/i,
  /claude\.ai/i,
  /gemini\.google/i,
  /bard\.google/i,
  /copilot\.microsoft/i,
  /bing\.com\/chat/i,
  /you\.com/i,
  /phind\.com/i,
  /poe\.com/i,
  /meta\.ai/i,
  /grok\.x/i,
  /x\.ai/i,
  /deepseek/i,
  /writesonic/i,
  /jasper\.ai/i,
  /anthropic/i,
];

const AI_CHANNEL_NAMES = new Set([
  "ai assistant",
  "ai assistants",
  "ai referral",
  "ai search",
]);

/** Label canónico que mostramos en el dashboard. */
export const AI_CHANNEL_LABEL = "AI Assistants";

export function isAiTraffic(input: {
  source?: string;
  medium?: string;
  channel?: string;
}): boolean {
  const source = input.source ?? "";
  const medium = input.medium ?? "";
  const channel = (input.channel ?? "").trim().toLowerCase();

  if (AI_CHANNEL_NAMES.has(channel)) return true;
  if (medium.toLowerCase() === "ai-assistant") return true;

  return AI_SOURCE_PATTERNS.some(
    (re) => re.test(source) || re.test(medium),
  );
}

/** Reasigna el canal visible: IA → AI Assistants; resto igual. */
export function displayChannelGroup(input: {
  source?: string;
  medium?: string;
  channel?: string;
}): string {
  if (isAiTraffic(input)) return AI_CHANNEL_LABEL;
  return input.channel?.trim() || "(not set)";
}

export function aiPlatformLabel(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("chatgpt") || s.includes("openai")) return "ChatGPT";
  if (s.includes("perplexity")) return "Perplexity";
  if (s.includes("claude") || s.includes("anthropic")) return "Claude";
  if (s.includes("gemini") || s.includes("bard")) return "Gemini";
  if (s.includes("copilot")) return "Copilot";
  if (s.includes("you.com")) return "You.com";
  if (s.includes("phind")) return "Phind";
  if (s.includes("poe")) return "Poe";
  if (s.includes("meta.ai")) return "Meta AI";
  if (s.includes("grok") || s.includes("x.ai")) return "Grok";
  if (s.includes("deepseek")) return "DeepSeek";
  return source || "(desconocido)";
}
