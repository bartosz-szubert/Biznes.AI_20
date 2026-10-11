import { useRef, useState } from 'react';
import { calculatePlan } from '../domain/calc';
import { LIMITS, type Scenario } from '../domain/types';
import { formatDate, formatPLN, formatPct } from '../format';
import { buildExportFile, parseImportFile } from '../domain/schema';
import { findNameConflicts, type ConflictStrategy } from '../domain/scenarios';

export interface PendingImport {
  scenarios: Scenario[];
  conflicts: string[];
}

interface Props {
  scenarios: Scenario[];
  loadedId: string | null;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => string | null;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCompare: () => void;
  onImportParsed: (imported: Scenario[], strategy: ConflictStrategy) => void;
  onNotify: (message: string) => void;
}

export function ScenarioList(props: Props) {
  const { scenarios, loadedId, compareIds, onToggleCompare, onOpen, onRename, onDuplicate, onDelete, onCompare } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const exportScenarios = (list: Scenario[], filename: string) => {
    const blob = new Blob([JSON.stringify(buildExportFile(list), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    props.onNotify(`Wyeksportowano ${list.length} scenariusz(y).`);
  };

  const selectedForExport = scenarios.filter((s) => compareIds.includes(s.id));
  const exportList = selectedForExport.length > 0 ? selectedForExport : scenarios;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    setPending(null);
    const parsed = parseImportFile(await file.text());
    if (!parsed.ok) {
      setImportError(parsed.error);
      return;
    }
    const conflicts = findNameConflicts(scenarios, parsed.scenarios);
    if (conflicts.length === 0) {
      props.onImportParsed(parsed.scenarios, 'keep-both');
      props.onNotify(`Zaimportowano ${parsed.scenarios.length} scenariusz(y).`);
    } else {
      setPending({ scenarios: parsed.scenarios, conflicts });
    }
  };

  const resolve = (strategy: ConflictStrategy) => {
    if (!pending) return;
    props.onImportParsed(pending.scenarios, strategy);
    props.onNotify(`Zaimportowano ${pending.scenarios.length} scenariusz(y).`);
    setPending(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRename = (s: Scenario) => {
    const next = window.prompt(`Nowa nazwa (maks. ${LIMITS.nameMax} znaków):`, s.name);
    if (next === null) return;
    const error = onRename(s.id, next);
    if (error) props.onNotify(error);
  };

  const handleDelete = (s: Scenario) => {
    if (window.confirm(`Usunąć scenariusz „${s.name}”? Tej operacji nie da się cofnąć.`)) onDelete(s.id);
  };

  const canCompare = compareIds.length >= LIMITS.compareMin && compareIds.length <= LIMITS.compareMax;

  return (
    <section aria-labelledby="scenarios-title">
      <div className="card">
        <div className="card-title">
          <h2 id="scenarios-title">Zapisane scenariusze ({scenarios.length})</h2>
          <button type="button" className="primary" onClick={onCompare} disabled={!canCompare}>
            Porównaj zaznaczone ({compareIds.length})
          </button>
        </div>
        <p className="muted">
          Zaznacz od {LIMITS.compareMin} do {LIMITS.compareMax} scenariuszy, aby je porównać. Scenariusze są zapisane lokalnie w tej przeglądarce – eksportuj je do pliku, żeby nie stracić danych.
        </p>

        <div className="row" style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => exportScenarios(exportList, 'scenariusze-budzet-roi.json')}
            disabled={scenarios.length === 0}
          >
            {selectedForExport.length > 0
              ? `Eksportuj zaznaczone (${selectedForExport.length}) do JSON`
              : 'Eksportuj wszystkie do JSON'}
          </button>
          <label className="field">
            Import z pliku JSON
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        </div>

        {importError && (
          <div className="alert error" role="alert">
            {importError} Istniejące scenariusze nie zostały zmienione.
          </div>
        )}
        {pending && (
          <div className="alert warn" role="alert">
            <p style={{ margin: '0 0 0.5rem' }}>
              W pliku są scenariusze o nazwach, które już istnieją ({pending.conflicts.join(', ')}). Co zrobić?
            </p>
            <div className="row">
              <button type="button" onClick={() => resolve('replace')}>
                Zastąp istniejące
              </button>
              <button type="button" onClick={() => resolve('keep-both')}>
                Dodaj jako kopie
              </button>
              <button type="button" onClick={() => resolve('skip')}>
                Pomiń duplikaty
              </button>
              <button type="button" onClick={() => setPending(null)}>
                Anuluj
              </button>
            </div>
          </div>
        )}

        {scenarios.length === 0 ? (
          <div className="empty">
            <p>Nie masz jeszcze zapisanych scenariuszy. Ustaw plan w zakładce „Planer” i zapisz go.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col" className="check-cell">
                    <span className="sr-only">Porównaj</span>
                  </th>
                  <th scope="col">Nazwa</th>
                  <th scope="col">Zmodyfikowano</th>
                  <th scope="col" className="num">
                    Budżet
                  </th>
                  <th scope="col" className="num">
                    ROI całkowite
                  </th>
                  <th scope="col">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  const r = calculatePlan(s);
                  const checked = compareIds.includes(s.id);
                  const disabled = !checked && compareIds.length >= LIMITS.compareMax;
                  return (
                    <tr key={s.id}>
                      <td className="check-cell">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => onToggleCompare(s.id)}
                          aria-label={`Porównaj scenariusz ${s.name}`}
                        />
                      </td>
                      <td>
                        <div className="scenario-name">
                          {s.name}
                          {loadedId === s.id && <span className="badge">otwarty</span>}
                        </div>
                        {s.note && <div className="muted">{s.note}</div>}
                      </td>
                      <td>{formatDate(s.updatedAt)}</td>
                      <td className="num">{formatPLN(r.allocatedBudget)}</td>
                      <td className="num">{formatPct(r.totalRoiPct)}</td>
                      <td>
                        <div className="row" style={{ gap: '0.4rem' }}>
                          <button type="button" onClick={() => onOpen(s.id)}>
                            Otwórz
                          </button>
                          <button type="button" onClick={() => handleRename(s)}>
                            Zmień nazwę
                          </button>
                          <button type="button" onClick={() => onDuplicate(s.id)}>
                            Duplikuj
                          </button>
                          <button type="button" className="danger" onClick={() => handleDelete(s)}>
                            Usuń
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
