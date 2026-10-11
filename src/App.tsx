import { useEffect, useState } from 'react';
import { Compare } from './components/Compare';
import { About } from './components/About';
import { Planner } from './components/Planner';
import { ScenarioList } from './components/ScenarioList';
import { calculatePlan } from './domain/calc';
import { planWarnings } from './domain/planActions';
import { planFromPreset, DEFAULT_PRESET_ID } from './domain/presets';
import { createScenario, duplicateScenario, mergeImported, plansEqual, planOf, type ConflictStrategy } from './domain/scenarios';
import { LIMITS, type Plan, type Scenario } from './domain/types';
import { loadScenarios, saveScenarios } from './storage/scenarioStore';

type Tab = 'planner' | 'scenarios' | 'compare' | 'about';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'planner', label: 'Planer' },
  { id: 'scenarios', label: 'Scenariusze' },
  { id: 'compare', label: 'Porównanie' },
  { id: 'about', label: 'O metodzie' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('planner');
  const [scenarios, setScenarios] = useState<Scenario[]>(() => loadScenarios());
  const [plan, setPlan] = useState<Plan>(() => planFromPreset(DEFAULT_PRESET_ID));
  const [savedPlan, setSavedPlan] = useState<Plan>(() => planFromPreset(DEFAULT_PRESET_ID));
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const loaded = scenarios.find((s) => s.id === loadedId) ?? null;
  const isDirty = !plansEqual(plan, savedPlan);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  /** Zapisuje listę i aktualizuje stan; przy błędzie pamięci zostaje tylko w bieżącej sesji. */
  const commit = (next: Scenario[]): void => {
    setScenarios(next);
    const res = saveScenarios(next);
    if (!res.ok) setToast(res.error);
  };

  const confirmDiscard = (): boolean =>
    !isDirty || window.confirm('Masz niezapisane zmiany w planie. Odrzucić je?');

  const handleSave = (rawName: string, rawNote: string, asNew: boolean): string | null => {
    const name = rawName.trim();
    const note = rawNote.trim();
    if (!calculatePlan(plan).isBalanced) return 'Suma udziałów musi wynosić 100%.';

    if (!asNew && loaded) {
      const finalName = name || loaded.name;
      if (scenarios.some((s) => s.id !== loaded.id && s.name === finalName)) {
        return 'Scenariusz o tej nazwie już istnieje.';
      }
      const updated: Scenario = {
        ...loaded,
        ...planOf(plan),
        name: finalName,
        note: note || loaded.note,
        updatedAt: new Date().toISOString(),
      };
      commit(scenarios.map((s) => (s.id === loaded.id ? updated : s)));
      setSavedPlan(planOf(plan));
      setToast(`Zapisano zmiany w scenariuszu „${finalName}”.`);
      return null;
    }

    if (name === '') return 'Podaj nazwę scenariusza.';
    if (name.length > LIMITS.nameMax) return `Nazwa może mieć maksymalnie ${LIMITS.nameMax} znaków.`;
    if (note.length > LIMITS.noteMax) return `Notatka może mieć maksymalnie ${LIMITS.noteMax} znaków.`;
    if (scenarios.some((s) => s.name === name)) return 'Scenariusz o tej nazwie już istnieje.';

    const created = createScenario(plan, name, note);
    commit([...scenarios, created]);
    setLoadedId(created.id);
    setSavedPlan(planOf(plan));
    setToast(`Zapisano scenariusz „${name}”.`);
    return null;
  };

  const openScenario = (id: string) => {
    const s = scenarios.find((x) => x.id === id);
    if (!s || !confirmDiscard()) return;
    const next = planOf(s);
    setPlan(next);
    setSavedPlan(next);
    setLoadedId(s.id);
    setTab('planner');
  };

  const newPlan = () => {
    if (!confirmDiscard()) return;
    const fresh = planFromPreset(DEFAULT_PRESET_ID, plan.totalBudget);
    setPlan(fresh);
    setSavedPlan(fresh);
    setLoadedId(null);
    setTab('planner');
  };

  const renameScenario = (id: string, rawName: string): string | null => {
    const name = rawName.trim();
    if (name === '') return 'Nazwa nie może być pusta.';
    if (name.length > LIMITS.nameMax) return `Nazwa może mieć maksymalnie ${LIMITS.nameMax} znaków.`;
    if (scenarios.some((s) => s.id !== id && s.name === name)) return 'Scenariusz o tej nazwie już istnieje.';
    commit(scenarios.map((s) => (s.id === id ? { ...s, name, updatedAt: new Date().toISOString() } : s)));
    return null;
  };

  const duplicate = (id: string) => {
    const s = scenarios.find((x) => x.id === id);
    if (!s) return;
    commit([...scenarios, duplicateScenario(s, scenarios)]);
    setToast(`Utworzono kopię „${s.name}”.`);
  };

  const remove = (id: string) => {
    commit(scenarios.filter((s) => s.id !== id));
    setCompareIds((ids) => ids.filter((x) => x !== id));
    if (loadedId === id) setLoadedId(null);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= LIMITS.compareMax) return ids;
      return [...ids, id];
    });
  };

  const importScenarios = (imported: Scenario[], strategy: ConflictStrategy) => {
    commit(mergeImported(scenarios, imported, strategy));
  };

  const openCompare = () => setTab('compare');

  const compared = scenarios.filter((s) => compareIds.includes(s.id));
  const warningCount = planWarnings(plan).length;

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Przejdź do treści
      </a>
      <header className="app-header">
        <div>
          <h1>Planer budżetu i ROI</h1>
          <div className="muted">
            Roczny budżet marketingowy: social media, WWW, radio
            {loaded ? ` · scenariusz: ${loaded.name}` : ' · plan bez zapisu'}
            {isDirty && ' · niezapisane zmiany'}
          </div>
        </div>
        <button type="button" onClick={newPlan}>
          Nowy plan
        </button>
      </header>

      <div className="tabs" role="tablist" aria-label="Sekcje aplikacji">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="main"
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'planner' && warningCount > 0 && <span className="badge">{warningCount}</span>}
            {t.id === 'scenarios' && scenarios.length > 0 && <span className="badge">{scenarios.length}</span>}
          </button>
        ))}
      </div>

      <main id="main" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'planner' && (
          <Planner
            plan={plan}
            onChange={setPlan}
            loadedName={loaded?.name ?? null}
            onSave={handleSave}
            isDirty={isDirty}
          />
        )}
        {tab === 'scenarios' && (
          <ScenarioList
            scenarios={scenarios}
            loadedId={loadedId}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
            onOpen={openScenario}
            onRename={renameScenario}
            onDuplicate={duplicate}
            onDelete={remove}
            onCompare={openCompare}
            onImportParsed={importScenarios}
            onNotify={setToast}
          />
        )}
        {tab === 'compare' && (
          <Compare
            scenarios={compared.length >= LIMITS.compareMin ? compared : []}
            onBack={() => setTab('scenarios')}
          />
        )}
        {tab === 'about' && <About />}
      </main>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
