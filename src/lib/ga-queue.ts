/**
 * GA4 Data API: máx. 10 requests concurrentes por propiedad (standard).
 * https://developers.google.com/analytics/devguides/reporting/data/v1/quotas
 */
const MAX_CONCURRENT = 4;

let active = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    waiters.push(() => {
      active += 1;
      resolve();
    });
  });
}

function release() {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

function isResourceExhausted(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Exhausted concurrent requests")
  );
}

export async function withGaLimit<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await acquire();
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isResourceExhausted(error) || attempt === maxAttempts) {
        throw error;
      }
    } finally {
      release();
    }
    // Backoff corto si GA4 sigue saturado
    await new Promise((r) => setTimeout(r, 250 * attempt));
  }

  throw lastError;
}
