import { useMemo, useState } from 'react';
import { calculatePlan, type PlanResult } from '../domain/calc';
import { CHANNEL_IDS, type Scenario } from '../domain/types';
import { CHANNELS } from '../domain/channels';
import { formatDate, formatPLN, formatPct, formatRoas, formatSignedPLN, formatSignedPct } from '../format';
import { ScenarioBars, StructureStacked, compactPLN } from './Charts';

interface Props {
  scenarios: Scenario[];
  onBack: () => void;
}

export function Compare({ scenarios, onBack }: Props) {
  const [baseId, setBaseId] = useState<string>(scenarios[0]?.id ?? '');
  const base = scenarios.find((s) => s.id === baseId) ?? scenarios[0];

  const results = useMemo(() => new Map(scenarios.map((s) => [s.id, calculatePlan(s)])), [scenarios]);
  const baseResult = base ? results.get(base.id)! : null;

  if (!base || !baseResult) {
    return (
      <div className="card empty">
        <p>Wybierz od 2 do 4 scenariuszy w zakładce „Scenariusze”.</p>
        <button type="button" onClick={onBack}>
          Wróć do scenariuszy
        </button>
      </div>
    );
  }

  const bestRoi = Math.max(...scenarios.map((s) => results.get(s.id)!.totalRoiPct));
  const bestProfit = Math.max(...scenarios.map((s) => results.get(s.id)!.totalProfit));
  const budgets = new Set(scenarios.map((s) => results.get(s.id)!.allocatedBudget));

  const names = scenarios.map((s) => s.name);
  const roiData = scenarios.map((s) => ({ name: s.name, value: results.get(s.id)!.totalRoiPct }));
  const profitData = scenarios.map((s) => ({ name: s.name, value: results.get(s.id)!.totalProfit }));
  const structureData = scenarios.map((s) => {
    const r = results.get(s.id)!;
    const share = (id: (typeof CHANNEL_IDS)[number]) => r.channels.find((c) => c.id === id)!.sharePct;
    return { name: s.name, social: share('social'), www: share('www'), radio: share('radio') };
  });

  const rows: Array<{
    label: string;
    cell: (s: Scenario, r: PlanResult) => string;
    delta?: (s: Scenario, r: PlanResult) => { text: string; dir: 'up' | 'down' | 'flat' } | null;
    key?: string;
  }> = [
    { label: 'Budżet', cell: (_, r) => formatPLN(r.allocatedBudget), delta: (_, r) => delta(r.allocatedBudget - baseResult.allocatedBudget, formatSignedPLN) },
    ...CHANNEL_IDS.map((id) => ({
      label: `Udział: ${CHANNELS[id].name}`,
      cell: (_: Scenario, r: PlanResult) => formatPct(r.channels.find((c) => c.id === id)!.sharePct),
      delta: (_: Scenario, r: PlanResult) =>
        delta(
          r.channels.find((c) => c.id === id)!.sharePct - baseResult.channels.find((c) => c.id === id)!.sharePct,
          (v) => `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')} pp`,
        ),
    })),
    ...CHANNEL_IDS.map((id) => ({
      label: `ROI: ${CHANNELS[id].name}`,
      cell: (s: Scenario) => formatPct(s.channels.find((c) => c.id === id)!.roiPct),
      delta: (s: Scenario) =>
        delta(
          s.channels.find((c) => c.id === id)!.roiPct - base.channels.find((c) => c.id === id)!.roiPct,
          formatSignedPct,
        ),
    })),
    { label: 'Przychód', cell: (_, r) => formatPLN(r.totalRevenue), delta: (_, r) => delta(r.totalRevenue - baseResult.totalRevenue, formatSignedPLN) },
    { label: 'Zysk', cell: (_, r) => formatPLN(r.totalProfit), delta: (_, r) => delta(r.totalProfit - baseResult.totalProfit, formatSignedPLN), key: 'profit' },
    { label: 'ROAS', cell: (_, r) => formatRoas(r.roas) },
    { label: 'ROI całkowite', cell: (_, r) => formatPct(r.totalRoiPct), delta: (_, r) => delta(r.totalRoiPct - baseResult.totalRoiPct, formatSignedPct), key: 'roi' },
  ];

  function delta(diff: number, fmt: (v: number) => string): { text: string; dir: 'up' | 'down' | 'flat' } | null {
    if (Math.abs(diff) < 0.05) return { text: '±0', dir: 'flat' };
    return { text: fmt(diff), dir: diff > 0 ? 'up' : 'down' };
  }

  return (
    <section aria-labelledby="compare-title">
      <div className="card-title" style={{ marginBottom: '0.75rem' }}>
        <h2 id="compare-title">Porównanie scenariuszy</h2>
        <button type="button" onClick={onBack}>
          Wróć do scenariuszy
        </button>
      </div>

      <div className="card">
        <div className="row" style={{ alignItems: 'center' }}>
          <span className="muted">Scenariusz bazowy (Δ liczone względem niego):</span>
          <div role="radiogroup" aria-label="Scenariusz bazowy" className="row" style={{ gap: '0.5rem' }}>
            {scenarios.map((s) => (
              <label key={s.id} className="badge" style={{ cursor: 'pointer', padding: '0.3rem 0.7rem' }}>
                <input
                  type="radio"
                  name="base"
                  value={s.id}
                  checked={s.id === base.id}
                  onChange={() => setBaseId(s.id)}
                  style={{ marginRight: '0.35rem' }}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
        {budgets.size > 1 && (
          <div className="alert warn">
            Scenariusze mają różne budżety, więc zysk w PLN nie jest wprost porównywalny. Patrz przede wszystkim na ROI.
          </div>
        )}
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Wskaźnik</th>
              {scenarios.map((s) => (
                <th key={s.id} scope="col" className="num">
                  {s.name}
                  {s.id === base.id && <span className="badge">baza</span>}
                  <div className="muted" style={{ fontWeight: 400 }}>
                    {formatDate(s.updatedAt)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} style={row.key === 'roi' ? { fontWeight: 600 } : undefined}>
                <th scope="row">{row.label}</th>
                {scenarios.map((s) => {
                  const r = results.get(s.id)!;
                  const d = s.id !== base.id && row.delta ? row.delta(s, r) : null;
                  const isBest =
                    (row.key === 'roi' && r.totalRoiPct === bestRoi && scenarios.length > 1) ||
                    (row.key === 'profit' && r.totalProfit === bestProfit && scenarios.length > 1);
                  return (
                    <td key={s.id} className="num">
                      {row.cell(s, r)}
                      {isBest && <span className="badge">{row.key === 'roi' ? 'Najwyższy ROI' : 'Najwyższy zysk'}</span>}
                      {d && <div className={`delta ${d.dir}`}>{d.dir === 'up' ? '▲ ' : d.dir === 'down' ? '▼ ' : ''}{d.text}</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>ROI całkowite</h2>
          <ScenarioBars data={roiData} format={formatPct} tickFormat={(v) => `${v}%`} label="ROI całkowite" color="var(--accent)" />
        </div>
        <div className="card">
          <h2>Zysk (PLN)</h2>
          <ScenarioBars data={profitData} format={formatPLN} tickFormat={compactPLN} label="Zysk" color="var(--accent)" />
        </div>
      </div>

      <div className="card">
        <h2>Struktura budżetu (udział kanałów)</h2>
        <StructureStacked data={structureData} />
        <p className="legend-note">Scenariusze: {names.join(' · ')}</p>
      </div>
    </section>
  );
}
