import { describe, expect, it } from 'vitest';
import { buildExportFile, parseImportFile } from './schema';
import { createScenario, mergeImported, uniqueName } from './scenarios';
import { planFromPreset } from './presets';
import type { Scenario } from './types';

const sample = (name: string): Scenario =>
  createScenario(planFromPreset('balanced', 500_000), name, 'notatka', new Date('2026-10-11T10:00:00Z'));

describe('eksport i import (AC6, AC7)', () => {
  it('eksport → import daje identyczne scenariusze', () => {
    const list = [sample('A'), sample('B')];
    const text = JSON.stringify(buildExportFile(list));
    const parsed = parseImportFile(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.scenarios).toEqual(list);
  });

  it('uszkodzony JSON daje czytelny błąd i nie rzuca wyjątku', () => {
    const res = parseImportFile('{"app": ');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/JSON/);
  });

  it('obcy plik (zły app) jest odrzucany', () => {
    const res = parseImportFile(JSON.stringify({ app: 'inny', exportedAt: '', scenarios: [] }));
    expect(res.ok).toBe(false);
  });

  it('scenariusz z sumą udziałów ≠ 100% jest odrzucany', () => {
    const s = sample('X');
    s.channels[0].sharePct = 60;
    const res = parseImportFile(JSON.stringify(buildExportFile([s])));
    expect(res.ok).toBe(false);
  });

  it('budżet powyżej limitu jest odrzucany', () => {
    const s = { ...sample('X'), totalBudget: 2_000_000_000 };
    const res = parseImportFile(JSON.stringify(buildExportFile([s])));
    expect(res.ok).toBe(false);
  });
});

describe('konflikty nazw przy imporcie', () => {
  const existing = [sample('A')];

  it('replace nadpisuje wpis, zachowując id istniejącego', () => {
    const incoming = { ...sample('A'), note: 'nowa' };
    const merged = mergeImported(existing, [incoming], 'replace');
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(existing[0].id);
    expect(merged[0].note).toBe('nowa');
  });

  it('skip pomija duplikat', () => {
    const merged = mergeImported(existing, [sample('A')], 'skip');
    expect(merged).toHaveLength(1);
  });

  it('keep-both dodaje kopię z sufiksem i nowym id', () => {
    const merged = mergeImported(existing, [sample('A')], 'keep-both');
    expect(merged).toHaveLength(2);
    expect(merged[1].name).toBe('A (2)');
    expect(merged[1].id).not.toBe(existing[0].id);
  });
});

describe('uniqueName', () => {
  it('dodaje kolejne numery i pilnuje limitu 60 znaków', () => {
    const long = 'x'.repeat(60);
    const name = uniqueName(long, new Set([long]));
    expect(name.length).toBeLessThanOrEqual(60);
    expect(name.endsWith(' (2)')).toBe(true);
  });
});
