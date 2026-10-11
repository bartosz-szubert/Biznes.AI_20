import { scenarioSchema } from '../domain/schema';
import type { Scenario } from '../domain/types';

/**
 * Lokalny zapis scenariuszy (PRD FR-35). Dane zostają w przeglądarce.
 * Każdy dostęp do localStorage jest w try/catch – prywatne okno lub zablokowane dane mogą go wyłączyć.
 */

const KEY = 'budget-roi-planner:scenarios:v1';

export type StoreResult = { ok: true } | { ok: false; error: string };

export function loadScenarios(): Scenario[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Pojedynczy uszkodzony wpis nie blokuje reszty.
    return parsed.flatMap((item) => {
      const res = scenarioSchema.safeParse(item);
      return res.success ? [res.data as Scenario] : [];
    });
  } catch {
    return [];
  }
}

export function saveScenarios(scenarios: readonly Scenario[]): StoreResult {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(scenarios));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        'Nie udało się zapisać scenariuszy w tej przeglądarce (brak miejsca lub zablokowany zapis). Wyeksportuj scenariusze do pliku JSON.',
    };
  }
}
