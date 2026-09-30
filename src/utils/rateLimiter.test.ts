import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from './rateLimiter';

describe('limiteur de débit', () => {
  afterEach(() => vi.useRealTimers());

  it('espace les appels de l’intervalle demandé', async () => {
    vi.useFakeTimers();
    const schedule = createRateLimiter(4000);
    const started: number[] = [];
    const task = async () => {
      started.push(Date.now());
    };
    const t0 = Date.now();
    const all = Promise.all([schedule(task), schedule(task), schedule(task)]);
    await vi.advanceTimersByTimeAsync(8000);
    await all;
    expect(started.map((t) => t - t0)).toEqual([0, 4000, 8000]);
  });
});
