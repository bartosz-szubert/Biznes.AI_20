import { fromTenths, toTenths } from './calc';
import type { ChannelId, ChannelInput } from './types';

/** Dzieli `amount` (liczba całkowita) proporcjonalnie do wag metodą największych reszt. */
export function largestRemainder(amount: number, weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  const effective = total > 0 ? weights : weights.map(() => 1);
  const effTotal = total > 0 ? total : weights.length;
  const exact = effective.map((w) => (amount * w) / effTotal);
  const result = exact.map(Math.floor);
  let rest = amount - result.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0 && k < order.length; k++, rest--) {
    result[order[k].i] += 1;
  }
  return result;
}

export interface RebalanceResult {
  channels: ChannelInput[];
  /** false, gdy nie dało się wyrównać (np. wszystkie kanały zablokowane). */
  ok: boolean;
}

/**
 * „Wyrównaj do 100%” (FR-04, FR-05). Różnicę rozkłada proporcjonalnie na niezablokowane kanały
 * inne niż ostatnio edytowany; ostatnio edytowany zmienia się tylko, gdy inaczej się nie da.
 */
export function rebalance(channels: readonly ChannelInput[], lastEditedId: ChannelId | null): RebalanceResult {
  const tenths = channels.map((c) => toTenths(c.sharePct));
  let diff = 1000 - tenths.reduce((a, b) => a + b, 0);

  const pools = [
    channels.map((c, i) => (!c.locked && c.id !== lastEditedId ? i : -1)).filter((i) => i >= 0),
    channels.map((c, i) => (!c.locked && c.id === lastEditedId ? i : -1)).filter((i) => i >= 0),
  ];

  for (const pool of pools) {
    if (diff === 0) break;
    if (pool.length === 0) continue;
    const weights = pool.map((i) => tenths[i]);
    if (diff > 0) {
      largestRemainder(diff, weights).forEach((add, k) => (tenths[pool[k]] += add));
      diff = 0;
    } else {
      const capacity = weights.reduce((a, b) => a + b, 0);
      const take = Math.min(-diff, capacity);
      // take ≤ capacity, więc żaden kanał nie spadnie poniżej zera.
      largestRemainder(take, weights).forEach((sub, k) => (tenths[pool[k]] -= sub));
      diff += take;
    }
  }

  return {
    channels: channels.map((c, i) => ({ ...c, sharePct: fromTenths(tenths[i]) })),
    ok: diff === 0,
  };
}
