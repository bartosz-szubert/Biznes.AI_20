import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  allocateGrosze,
  balance,
  buildExportFile,
  calculatePlan,
  createScenario,
  largestRemainder,
  mergeImported,
  parseImportFile,
  planFromPreset,
  PRESETS,
  rebalance,
  shareFromAmount,
  uniqueName,
  validateScenario,
} from '../js/domain.js';

const close = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 1e-9, `${msg ?? ''} ${actual} ≠ ${expected}`);

const plan = (shares, rois, budget = 500_000) => ({
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
  const [social, www, radio] = r.channels;

  test('liczy budżet, zysk i przychód kanałów', () => {
    assert.equal(social.budget, 225_000);
    assert.equal(social.profit, 337_500);
    assert.equal(social.revenue, 562_500);
    assert.equal(www.budget, 175_000);
    assert.equal(www.profit, 350_000);
    assert.equal(radio.budget, 100_000);
    assert.equal(radio.profit, 80_000);
    assert.equal(radio.revenue, 180_000);
  });

  test('liczy ROI całkowite, zysk, przychód i ROAS', () => {
    assert.equal(r.totalProfit, 767_500);
    assert.equal(r.totalRevenue, 1_267_500);
    close(r.totalRoiPct, 153.5, 'ROI całkowite');
    close(r.roas, 2.535, 'ROAS');
  });

  test('ROI całkowite równa się Σ(wᵢ × ROIᵢ)', () => {
    const weighted = r.channels.reduce((s, c) => s + (c.sharePct / 100) * c.roiPct, 0);
    close(r.totalRoiPct, weighted);
  });

  test('udział kanału w zysku sumuje się do 100%', () => {
    close(r.channels.reduce((s, c) => s + c.profitSharePct, 0), 100);
  });
});

describe('zaokrąglenia (NFR-06)', () => {
  test('suma kwot równa budżetowi przy 100%', () => {
    assert.equal(allocateGrosze(100_001, [333, 333, 334]).reduce((a, b) => a + b, 0), 100_001);
  });
  test('reszta z zaokrągleń trafia do największego kanału', () => {
    assert.deepEqual(allocateGrosze(10, [334, 333, 333]), [4, 3, 3]);
  });
  test('budżet 0 daje zerowe wyniki', () => {
    const r = calculatePlan(plan([45, 35, 20], [150, 200, 80], 0));
    assert.equal(r.totalRoiPct, 0);
    assert.equal(r.roas, 0);
    assert.ok(r.channels.every((c) => c.budget === 0));
  });
});

describe('ROI ujemne i tryb marży', () => {
  test('ujemne ROI kanału obniża ROI całkowite (AC8)', () => {
    close(calculatePlan(plan([45, 35, 20], [150, 200, -20])).totalRoiPct, 133.5);
  });
  test('ROI na marży = (przychód × marża − budżet) / budżet', () => {
    const p = plan([100, 0, 0], [50, 0, 0], 100_000);
    p.marginMode = { enabled: true, grossMarginPct: 40 };
    close(calculatePlan(p).totalRoiMarginPct, -40);
  });
  test('ROI na marży jest null, gdy tryb wyłączony', () => {
    assert.equal(calculatePlan(planFromPreset('balanced')).totalRoiMarginPct, null);
  });
});

test('isBalanced i remainingPct przy sumie 95%', () => {
  const r = calculatePlan(plan([50, 30, 15], [100, 100, 100]));
  assert.equal(r.isBalanced, false);
  assert.equal(r.remainingPct, 5);
});

describe('presety', () => {
  for (const preset of PRESETS) {
    test(`preset ${preset.id} sumuje udziały do 100%`, () => {
      assert.equal(Object.values(preset.values).reduce((s, v) => s + v.sharePct, 0), 100);
    });
  }
  test('ROI całkowite z PRD 5.2 zgadza się z obliczeniami', () => {
    const expected = { balanced: 153.5, 'local-b2c': 165, ecommerce: 225, b2b: 189 };
    for (const preset of PRESETS) {
      close(calculatePlan(planFromPreset(preset.id, 500_000)).totalRoiPct, expected[preset.id], preset.id);
    }
  });
});

test('shareFromAmount przelicza kwotę na udział; budżet 0 → 0', () => {
  assert.equal(shareFromAmount(225_000, 500_000), 45);
  assert.equal(shareFromAmount(100, 0), 0);
});

test('largestRemainder rozdziela całą kwotę; bez wag dzieli równo', () => {
  assert.equal(largestRemainder(10, [1, 1, 1]).reduce((a, b) => a + b, 0), 10);
  assert.deepEqual(largestRemainder(7, [0, 0, 0]), [3, 2, 2]);
});

describe('rebalance – „Wyrównaj do 100%” (AC2, AC3)', () => {
  const ch = (id, sharePct, locked = false) => ({ id, sharePct, roiPct: 0, locked });

  test('AC2: 50/30/15 (95%) po wyrównaniu sumuje się do 100%', () => {
    const res = rebalance([ch('social', 50), ch('www', 30), ch('radio', 15)], 'radio');
    assert.equal(res.ok, true);
    close(res.channels.reduce((s, c) => s + c.sharePct, 0), 100);
  });

  test('AC3: Radio zablokowane na 20%, Social 55% → WWW 25%, Radio 20%', () => {
    const res = rebalance([ch('social', 55), ch('www', 25), ch('radio', 20, true)], 'social');
    const by = Object.fromEntries(res.channels.map((c) => [c.id, c.sharePct]));
    assert.equal(by.radio, 20);
    assert.equal(by.www, 25);
    assert.equal(by.social, 55);
    assert.equal(res.ok, true);
  });

  test('przy sumie > 100% nie schodzi poniżej zera', () => {
    const res = rebalance([ch('social', 90), ch('www', 5), ch('radio', 20)], 'radio');
    assert.equal(res.ok, true);
    assert.ok(res.channels.every((c) => c.sharePct >= 0));
    close(res.channels.reduce((s, c) => s + c.sharePct, 0), 100);
  });

  test('zwraca ok=false, gdy wszystkie kanały są zablokowane', () => {
    const res = rebalance([ch('social', 50, true), ch('www', 30, true), ch('radio', 15, true)], null);
    assert.equal(res.ok, false);
  });

  test('balance() zwraca plan z sumą 100%', () => {
    const p = { ...plan([50, 30, 15], [1, 1, 1]) };
    const out = calculatePlan(balance(p, 'radio'));
    assert.equal(out.isBalanced, true);
  });
});

describe('eksport i import (AC6, AC7)', () => {
  const sample = (name) => createScenario(planFromPreset('balanced', 500_000), name, 'notatka', new Date('2026-10-11T10:00:00Z'));

  test('eksport → import daje identyczne scenariusze', () => {
    const list = [sample('A'), sample('B')];
    const parsed = parseImportFile(JSON.stringify(buildExportFile(list)));
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.scenarios, list);
  });

  test('uszkodzony JSON daje czytelny błąd i nie rzuca wyjątku', () => {
    const res = parseImportFile('{"app": ');
    assert.equal(res.ok, false);
    assert.match(res.error, /JSON/);
  });

  test('obcy plik jest odrzucany', () => {
    assert.equal(parseImportFile(JSON.stringify({ app: 'inny', scenarios: [] })).ok, false);
  });

  test('scenariusz z sumą udziałów ≠ 100% jest odrzucany', () => {
    const s = sample('X');
    s.channels[0].sharePct = 60;
    assert.equal(parseImportFile(JSON.stringify(buildExportFile([s]))).ok, false);
  });

  test('budżet powyżej limitu jest odrzucany', () => {
    const s = { ...sample('X'), totalBudget: 2_000_000_000 };
    assert.equal(validateScenario(s) === null, false);
  });
});

describe('konflikty nazw przy imporcie', () => {
  const sample = (name) => createScenario(planFromPreset('balanced', 500_000), name, '');
  const existing = [sample('A')];

  test('replace nadpisuje wpis, zachowując id istniejącego', () => {
    const merged = mergeImported(existing, [{ ...sample('A'), note: 'nowa' }], 'replace');
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, existing[0].id);
    assert.equal(merged[0].note, 'nowa');
  });

  test('skip pomija duplikat', () => {
    assert.equal(mergeImported(existing, [sample('A')], 'skip').length, 1);
  });

  test('keep-both dodaje kopię z sufiksem i nowym id', () => {
    const merged = mergeImported(existing, [sample('A')], 'keep-both');
    assert.equal(merged.length, 2);
    assert.equal(merged[1].name, 'A (2)');
    assert.notEqual(merged[1].id, existing[0].id);
  });
});

test('uniqueName dodaje numer i pilnuje limitu 60 znaków', () => {
  const long = 'x'.repeat(60);
  const name = uniqueName(long, new Set([long]));
  assert.ok(name.length <= 60);
  assert.ok(name.endsWith(' (2)'));
});
