import { LIMITS, type Plan, type Scenario } from './types';

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createScenario(plan: Plan, name: string, note: string, now = new Date()): Scenario {
  const ts = now.toISOString();
  return {
    schemaVersion: 1,
    id: newId(),
    name: name.trim(),
    note: note.trim(),
    createdAt: ts,
    updatedAt: ts,
    ...clonePlan(plan),
  };
}

export function clonePlan(plan: Plan): Plan {
  return {
    currency: plan.currency,
    totalBudget: plan.totalBudget,
    presetId: plan.presetId,
    marginMode: { ...plan.marginMode },
    channels: plan.channels.map((c) => ({ ...c })),
  };
}

export function planOf(s: Plan): Plan {
  return clonePlan(s);
}

/** Porównuje dane planu (do wykrywania niezapisanych zmian, FR-34). */
export function plansEqual(a: Plan, b: Plan): boolean {
  return JSON.stringify(clonePlan(a)) === JSON.stringify(clonePlan(b));
}

/** Zwraca nazwę z sufiksem „(2)”, „(3)”… unikalną wśród `taken`, mieszczącą się w limicie znaków. */
export function uniqueName(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const suffix = ` (${n})`;
    const candidate = base.slice(0, LIMITS.nameMax - suffix.length) + suffix;
    if (!taken.has(candidate)) return candidate;
  }
}

export function duplicateScenario(s: Scenario, existing: readonly Scenario[], now = new Date()): Scenario {
  const name = uniqueName(`${s.name} – kopia`.slice(0, LIMITS.nameMax), new Set(existing.map((e) => e.name)));
  return createScenario(s, name, s.note, now);
}

export type ConflictStrategy = 'replace' | 'keep-both' | 'skip';

export function findNameConflicts(existing: readonly Scenario[], incoming: readonly Scenario[]): string[] {
  const names = new Set(existing.map((s) => s.name));
  return incoming.filter((s) => names.has(s.name)).map((s) => s.name);
}

/** Łączy importowane scenariusze z istniejącymi. Importowane dostają nowe id (bez kolizji). */
export function mergeImported(
  existing: readonly Scenario[],
  incoming: readonly Scenario[],
  strategy: ConflictStrategy,
): Scenario[] {
  const result = existing.map((s) => ({ ...s }));
  for (const imp of incoming) {
    const idx = result.findIndex((s) => s.name === imp.name);
    if (idx >= 0 && strategy === 'skip') continue;
    if (idx >= 0 && strategy === 'replace') {
      result[idx] = { ...imp, id: result[idx].id };
      continue;
    }
    const name = uniqueName(imp.name, new Set(result.map((s) => s.name)));
    result.push({ ...imp, id: newId(), name });
  }
  return result;
}
