/**
 * File d'attente qui garantit un intervalle minimal entre deux appels.
 * Utilisée pour respecter les limites de débit d'Open Food Facts.
 */
export function createRateLimiter(minIntervalMs: number, now: () => number = Date.now) {
  let nextSlot = 0;
  return async function schedule<T>(task: () => Promise<T>): Promise<T> {
    const current = now();
    const start = Math.max(current, nextSlot);
    nextSlot = start + minIntervalMs;
    const wait = start - current;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    return task();
  };
}
