// Lokalny zapis scenariuszy (PRD FR-35). Dane zostają w przeglądarce.
// Każdy dostęp do localStorage jest w try/catch – prywatne okno lub zablokowane dane mogą go wyłączyć.

import { validateScenario } from './domain.js';

const KEY = 'budget-roi-planner:scenarios:v1';

export function loadScenarios() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Pojedynczy uszkodzony wpis nie blokuje reszty.
    return parsed.filter((s) => validateScenario(s) === null);
  } catch {
    return [];
  }
}

export function saveScenarios(scenarios) {
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
