import { useState } from 'react';
import { calculatePlan } from '../domain/calc';
import { CHANNELS } from '../domain/channels';
import { PRESETS, findPreset } from '../domain/presets';
import {
  applyPreset,
  balance,
  isModifiedFromPreset,
  planWarnings,
  setBudget,
  setMargin,
  updateChannel,
} from '../domain/planActions';
import { CHANNEL_IDS, LIMITS, type ChannelId, type Plan } from '../domain/types';
import { formatPLN, formatPct, formatRoas } from '../format';
import { BudgetRevenueBars, BudgetDonut, CHANNEL_COLOR } from './Charts';
import { Kpi } from './Kpi';

interface Props {
  plan: Plan;
  onChange: (next: Plan) => void;
  loadedName: string | null;
  onSave: (name: string, note: string, asNew: boolean) => string | null;
  isDirty: boolean;
}

export function Planner({ plan, onChange, loadedName, onSave, isDirty }: Props) {
  const [lastEdited, setLastEdited] = useState<ChannelId | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const result = calculatePlan(plan);
  const warnings = planWarnings(plan);
  const preset = findPreset(plan.presetId);
  const modified = isModifiedFromPreset(plan);

  const edit = (next: Plan, channel?: ChannelId) => {
    if (channel) setLastEdited(channel);
    onChange(next);
  };

  const remaining = result.remainingPct;
  const canSave = result.isBalanced && plan.totalBudget > 0;

  const donutData = result.channels.map((c) => ({
    id: c.id,
    name: CHANNELS[c.id].name,
    value: c.budget,
    sharePct: c.sharePct,
  }));
  const barData = result.channels.map((c) => ({
    name: CHANNELS[c.id].name,
    budget: c.budget,
    revenue: c.revenue,
  }));

  const handleSave = (asNew: boolean) => {
    const error = onSave(name, note, asNew);
    setSaveError(error);
    if (!error && asNew) {
      setName('');
      setNote('');
    }
  };

  return (
    <section aria-labelledby="planner-title">
      <h2 id="planner-title" className="sr-only">
        Planer budżetu
      </h2>

      <div className="card">
        <div className="row">
          <label className="field">
            Budżet roczny (PLN)
            <input
              type="number"
              min={0}
              max={LIMITS.budgetMax}
              step={1000}
              value={plan.totalBudget}
              onChange={(e) => edit(setBudget(plan, e.target.valueAsNumber))}
              className="num-input"
              style={{ width: '12rem', textAlign: 'left' }}
              aria-describedby="budget-hint"
            />
          </label>
          <label className="field">
            Preset (profil firmy)
            <select value={plan.presetId} onChange={(e) => edit(applyPreset(plan, e.target.value))}>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => edit(applyPreset(plan, plan.presetId))} disabled={!modified}>
            Przywróć preset
          </button>
        </div>
        <p id="budget-hint" className="muted" style={{ margin: '0.5rem 0 0' }}>
          {preset?.description}{' '}
          <span className="legend-note">
            Wartości ROI to założenia startowe, nie dane rynkowe – dopasuj je do własnych kampanii.
          </span>
        </p>
        {modified && <p className="muted">Plan zmieniony ręcznie względem presetu „{preset?.name ?? '–'}”.</p>}
      </div>

      <div className="kpis" aria-live="polite">
        <Kpi label="Budżet" value={formatPLN(result.allocatedBudget)} />
        <Kpi label="Prognozowany przychód" value={formatPLN(result.totalRevenue)} />
        <Kpi label="Zysk" value={formatPLN(result.totalProfit)} />
        <Kpi label="ROAS" value={formatRoas(result.roas)} />
        <Kpi label="ROI całkowite" value={formatPct(result.totalRoiPct)} hero />
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Podział budżetu między kanały</h2>
          <span
            className={`status ${result.isBalanced ? 'ok' : 'bad'}`}
            role="status"
          >
            {result.isBalanced
              ? 'Suma: 100% ✓'
              : remaining > 0
                ? `Pozostało ${formatPct(remaining)} do rozdysponowania`
                : `Przekroczono o ${formatPct(-remaining)}`}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col" className="check-cell">
                  <span className="sr-only">Blokada</span>
                </th>
                <th scope="col">Kanał</th>
                <th scope="col">Udział</th>
                <th scope="col" className="num">
                  Kwota
                </th>
                <th scope="col" className="num">
                  ROI (%)
                </th>
                <th scope="col" className="num">
                  Zysk
                </th>
                <th scope="col" className="num">
                  Przychód
                </th>
              </tr>
            </thead>
            <tbody>
              {CHANNEL_IDS.map((id) => {
                const c = plan.channels.find((ch) => ch.id === id)!;
                const r = result.channels.find((ch) => ch.id === id)!;
                const meta = CHANNELS[id];
                return (
                  <tr key={id}>
                    <td className="check-cell">
                      <input
                        type="checkbox"
                        checked={c.locked}
                        onChange={(e) => edit(updateChannel(plan, id, { locked: e.target.checked }))}
                        aria-label={`Zablokuj kanał ${meta.name}`}
                        title="Zablokowany kanał nie zmienia się przy wyrównywaniu"
                      />
                    </td>
                    <td>
                      <span className="channel-chip" title={meta.description}>
                        <span className={`swatch ${id}`} aria-hidden="true" />
                        {meta.name}
                        {c.locked && <span className="badge">zablokowany</span>}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="range"
                          className="range"
                          min={0}
                          max={100}
                          step={0.1}
                          value={c.sharePct}
                          onChange={(e) => edit(updateChannel(plan, id, { sharePct: e.target.valueAsNumber }), id)}
                          aria-label={`Udział kanału ${meta.name} w %`}
                          style={{ accentColor: CHANNEL_COLOR[id] }}
                        />
                        <input
                          type="number"
                          className="num-input"
                          min={0}
                          max={100}
                          step={0.1}
                          value={c.sharePct}
                          onChange={(e) => {
                            if (e.target.value === '') return;
                            edit(updateChannel(plan, id, { sharePct: e.target.valueAsNumber }), id);
                          }}
                          aria-label={`Udział kanału ${meta.name} w procentach`}
                          style={{ width: '5rem' }}
                        />
                        <span>%</span>
                      </div>
                    </td>
                    <td className="num">{formatPLN(r.budget)}</td>
                    <td className="num">
                      <input
                        type="number"
                        className="num-input"
                        min={LIMITS.roiMin}
                        max={LIMITS.roiMax}
                        step={1}
                        value={c.roiPct}
                        onChange={(e) => {
                          if (e.target.value === '') return;
                          edit(updateChannel(plan, id, { roiPct: e.target.valueAsNumber }));
                        }}
                        aria-label={`ROI kanału ${meta.name} w procentach`}
                      />
                    </td>
                    <td className="num">{formatPLN(r.profit)}</td>
                    <td className="num">{formatPLN(r.revenue)}</td>
                  </tr>
                );
              })}
              <tr>
                <td />
                <th scope="row">Razem</th>
                <td className="num">{formatPct(result.shareSumPct)}</td>
                <td className="num">{formatPLN(result.allocatedBudget)}</td>
                <td className="num">{formatPct(result.totalRoiPct)}</td>
                <td className="num">{formatPLN(result.totalProfit)}</td>
                <td className="num">{formatPLN(result.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button type="button" onClick={() => edit(balance(plan, lastEdited))} disabled={result.isBalanced}>
            Wyrównaj do 100%
          </button>
          <span className="muted">
            Różnica rozkładana proporcjonalnie na niezablokowane kanały (poza ostatnio zmienionym, jeśli to możliwe).
          </span>
        </div>

        {!result.isBalanced && (
          <div className="alert error" role="alert">
            Suma udziałów musi wynosić 100%, aby zapisać scenariusz.
          </div>
        )}
        {warnings.map((w, i) => (
          <div className="alert warn" key={i}>
            {w.message}
          </div>
        ))}
      </div>

      <div className="card">
        <label className="row" style={{ alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={plan.marginMode.enabled}
            onChange={(e) => edit(setMargin(plan, { enabled: e.target.checked }))}
          />
          <span>Pokaż ROI na marży</span>
        </label>
        {plan.marginMode.enabled && (
          <div className="row" style={{ marginTop: '0.5rem' }}>
            <label className="field">
              Marża brutto (%)
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                className="num-input"
                value={plan.marginMode.grossMarginPct}
                onChange={(e) => {
                  if (e.target.value === '') return;
                  edit(setMargin(plan, { grossMarginPct: e.target.valueAsNumber }));
                }}
              />
            </label>
            <span className="muted">
              ROI na marży: <strong>{formatPct(result.totalRoiMarginPct ?? 0)}</strong> (przychód × marża − budżet, w stosunku do budżetu)
            </span>
          </div>
        )}
        <p className="muted" style={{ marginBottom: 0 }}>
          Jak liczymy: ROI kanału = (przychód − budżet) / budżet. ROI całkowite = zysk całkowity / budżet całkowity, czyli średnia ROI kanałów ważona udziałem w budżecie.
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Podział budżetu</h2>
          <BudgetDonut data={donutData} />
        </div>
        <div className="card">
          <h2>Budżet i przychód według kanałów</h2>
          <BudgetRevenueBars data={barData} />
        </div>
      </div>

      <div className="card">
        <h2>{loadedName ? `Scenariusz: ${loadedName}` : 'Zapisz jako scenariusz'}</h2>
        {isDirty && loadedName && (
          <p className="muted" style={{ marginTop: 0 }}>
            Masz niezapisane zmiany.
          </p>
        )}
        <div className="row">
          <label className="field grow">
            Nazwa scenariusza (wymagana, maks. {LIMITS.nameMax} znaków)
            <input
              type="text"
              value={name}
              maxLength={LIMITS.nameMax}
              onChange={(e) => setName(e.target.value)}
              placeholder={loadedName ? loadedName : 'np. Wariant A – więcej social'}
            />
          </label>
          <label className="field grow">
            Notatka (opcjonalna, maks. {LIMITS.noteMax} znaków)
            <input type="text" value={note} maxLength={LIMITS.noteMax} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          {loadedName && (
            <button type="button" className="primary" onClick={() => handleSave(false)} disabled={!canSave || !isDirty}>
              Zapisz zmiany w scenariuszu
            </button>
          )}
          <button
            type="button"
            className={loadedName ? '' : 'primary'}
            onClick={() => handleSave(true)}
            disabled={!canSave || name.trim() === ''}
          >
            Zapisz jako nowy scenariusz
          </button>
        </div>
        {saveError && (
          <div className="alert error" role="alert">
            {saveError}
          </div>
        )}
      </div>
    </section>
  );
}
