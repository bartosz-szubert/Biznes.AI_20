import { describe, expect, it } from 'vitest';
import { allocateGrosze, calculatePlan, shareFromAmount } from './calc';
import { planFromPreset } from './presets';
import { PRESETS } from './presets';
import { largestRemainder, rebalance } from './rebalance';
import type { ChannelInput, Plan } from './types';

const plan = (shares: [number, number, number], rois: [number, number, number], budget = 500_000): Plan => ({
  currency: 'PLN',
  totalBudget: budget,
  presetId: 'balanced',
  marginMode: { enabled: false, grossMarginPct: 40 },
  channels: [
    { id: 'social', sharePct: shares[0], roiPct: rois[0], locked: false },
    { id: 'www', sharePct: shares[1], roiPct: rois[1], locked: false },
    { id: 'radio', sharePct: shares[2], roiPct: rois[2], locked: false },
  ],
});

describe('calculatePlan – przykład z PRD 4.4', () => {
  const r = calculatePlan(planFromPreset('balanced', 500_000));

  it('liczy budżet, zysk i przychód kanałów', () => {
    const [social, www, radio] = r.channels;
    expect(social.budget).toBe(225_000);
    expect(social.profit).toBe(337_500);
    expect(social.revenue).toBe(562_500);
    expect(www.budget).toBe(175_000);
    expect(www.profit).toBe(350_000);
    expect(radio.budget).toBe(100_000);
    expect(radio.profit).toBe(80_000);
    expect(radio.revenue).toBe(180_000);
  });

  it('liczy ROI całkowite, zysk, przychód i ROAS', () => {
    expect(r.totalProfit).toBe(767_500);
    expect(r.totalRevenue).toBe(1_267_500);
    expect(r.totalRoiPct).toBeCloseTo(153.5, 10);
    expect(r.roas).toBeCloseTo(2.535, 10);
  });

  it('ROI całkowite równa się sumie Σ(wᵢ × ROIᵢ)', () => {
    const weighted = r.channels.reduce((s, c) => s + (c.sharePct / 100) * c.roiPct, 0);
    expect(r.totalRoiPct).toBeCloseTo(weighted, 10);
  });

  it('udział kanału w zysku sumuje się do 100%', () => {
    const sum = r.channels.reduce((s, c) => s + (c.profitSharePct ?? 0), 0);
    expect(sum).toBeCloseTo(100, 10);
  });
});

describe('zaokrąglenia (NFR-06)', () => {
  it('suma kwot kanałów zawsze równa budżetowi przy 100%', () => {
    const amounts = allocateGrosze(100_001, [333, 333, 334]);
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(100_001);
  });

  it('reszta z zaokrągleń trafia do największego kanału', () => {
    const amounts = allocateGrosze(10, [334, 333, 333]);
    expect(amounts).toEqual([4, 3, 3]);
  });

  it('dla budżetu 0 wszystkie kwoty są zerowe', () => {
    const r = calculatePlan(plan([45, 35, 20], [150, 200, 80], 0));
    expect(r.totalRoiPct).toBe(0);
    expect(r.roas).toBe(0);
    expect(r.channels.every((c) => c.budget === 0)).toBe(true);
  });
});

describe('ROI ujemne i tryb marży', () => {
  it('ujemne ROI kanału obniża ROI całkowite (AC8)', () => {
    const r = calculatePlan(plan([45, 35, 20], [150, 200, -20]));
    // 0,45×150 + 0,35×200 + 0,20×(−20) = 67,5 + 70 − 4 = 133,5
    expect(r.totalRoiPct).toBeCloseTo(133.5, 10);
  });

  it('ROI na marży = (przychód × marża − budżet) / budżet', () => {
    const p = plan([100, 0, 0], [50, 0, 0], 100_000);
    p.marginMode = { enabled: true, grossMarginPct: 40 };
    // przychód 150 000 × 40% = 60 000; (60 000 − 100 000) / 100 000 = −40%
    expect(calculatePlan(p).totalRoiMarginPct).toBeCloseTo(-40, 10);
  });

  it('ROI na marży jest null, gdy tryb wyłączony', () => {
    expect(calculatePlan(planFromPreset('balanced')).totalRoiMarginPct).toBeNull();
  });
});

describe('isBalanced i remainingPct', () => {
  it('wskazuje brak wyrównania przy sumie 95%', () => {
    const r = calculatePlan(plan([50, 30, 15], [100, 100, 100]));
    expect(r.isBalanced).toBe(false);
    expect(r.remainingPct).toBe(5);
  });
});

describe('presety', () => {
  it.each(PRESETS.map((p) => [p.id, p] as const))('preset %s sumuje udziały do 100%%', (_id, preset) => {
    const total = Object.values(preset.values).reduce((s, v) => s + v.sharePct, 0);
    expect(total).toBe(100);
  });

  it('wartości ROI całkowitego z PRD 5.2 zgadzają się z obliczeniami', () => {
    const expected: Record<string, number> = {
      balanced: 153.5,
      'local-b2c': 165,
      ecommerce: 225,
      b2b: 189,
    };
    for (const preset of PRESETS) {
      const r = calculatePlan(planFromPreset(preset.id, 500_000));
      expect(r.totalRoiPct).toBeCloseTo(expected[preset.id], 10);
    }
  });
});

describe('shareFromAmount', () => {
  it('przelicza kwotę na udział', () => {
    expect(shareFromAmount(225_000, 500_000)).toBe(45);
  });
  it('dla budżetu 0 zwraca 0', () => {
    expect(shareFromAmount(100, 0)).toBe(0);
  });
});

describe('largestRemainder', () => {
  it('rozdziela dokładnie całą kwotę', () => {
    expect(largestRemainder(10, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(10);
  });
  it('bez wag dzieli równo', () => {
    expect(largestRemainder(7, [0, 0, 0])).toEqual([3, 2, 2]);
  });
});

describe('rebalance – „Wyrównaj do 100%” (AC2, AC3)', () => {
  const ch = (id: ChannelInput['id'], sharePct: number, locked = false): ChannelInput => ({
    id,
    sharePct,
    roiPct: 0,
    locked,
  });

  it('AC2: 50/30/15 (95%) po wyrównaniu sumuje się do 100%', () => {
    const res = rebalance([ch('social', 50), ch('www', 30), ch('radio', 15)], 'radio');
    expect(res.ok).toBe(true);
    const sum = res.channels.reduce((s, c) => s + c.sharePct, 0);
    expect(sum).toBeCloseTo(100, 10);
  });

  it('AC3: Radio zablokowane na 20%, Social 55% → WWW 25%, Radio 20%', () => {
    const res = rebalance(
      [ch('social', 55), ch('www', 25), ch('radio', 20, true)],
      'social',
    );
    const byId = Object.fromEntries(res.channels.map((c) => [c.id, c.sharePct]));
    expect(byId.radio).toBe(20);
    expect(byId.www).toBe(25);
    expect(byId.social).toBe(55);
    expect(res.ok).toBe(true);
  });

  it('przy sumie > 100% zmniejsza kanały bez wpadania poniżej zera', () => {
    const res = rebalance([ch('social', 90), ch('www', 5), ch('radio', 20)], 'radio');
    expect(res.ok).toBe(true);
    expect(res.channels.every((c) => c.sharePct >= 0)).toBe(true);
    expect(res.channels.reduce((s, c) => s + c.sharePct, 0)).toBeCloseTo(100, 10);
  });

  it('zwraca ok=false, gdy wszystkie kanały są zablokowane', () => {
    const res = rebalance([ch('social', 50, true), ch('www', 30, true), ch('radio', 15, true)], null);
    expect(res.ok).toBe(false);
  });
});
