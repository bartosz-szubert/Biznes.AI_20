// Interfejs aplikacji: stan, zdarzenia i renderowanie. Logika liczb jest w domain.js.

import {
  CHANNEL_IDS,
  CHANNELS,
  DEFAULT_PRESET_ID,
  LIMITS,
  PRESETS,
  balance,
  applyPreset,
  buildExportFile,
  calculatePlan,
  clonePlan,
  compactPLN,
  createScenario,
  duplicateScenario,
  findNameConflicts,
  findPreset,
  formatDate,
  formatPLN,
  formatPct,
  formatRoas,
  formatSignedPLN,
  formatSignedPct,
  isModifiedFromPreset,
  mergeImported,
  parseImportFile,
  planFromPreset,
  planWarnings,
  plansEqual,
  setBudget,
  setMargin,
  updateChannel,
  uniqueName,
} from './domain.js';
import { donutChart, groupedBars, stackedShareBars, CHANNEL_COLOR } from './charts.js';
import { loadScenarios, saveScenarios } from './store.js';
import { openDialog } from './dialog.js';

// ---------- Pomocnicze ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Szerokość wykresu w pikselach = szerokość kontenera, żeby tekst osi miał właściwy rozmiar. */
const chartWidth = (el) => Math.max(280, Math.min(900, Math.floor((el.clientWidth || 640) - 8)));

/** Ustawia wartość pola, o ile użytkownik w nim akurat nie pisze (nie nadpisujemy tego, co wpisuje). */
function setIfIdle(el, value) {
  const s = String(value);
  if (document.activeElement !== el && el.value !== s) el.value = s;
}

// ---------- Stan ----------

const state = {
  tab: 'planner',
  scenarios: loadScenarios(),
  plan: planFromPreset(DEFAULT_PRESET_ID),
  savedPlan: null,
  loadedId: null,
  compareIds: [],
  compareBaseId: null,
  lastEdited: null,
  pendingImport: null,
  importError: null,
};
state.savedPlan = clonePlan(state.plan);

const isDirty = () => !plansEqual(state.plan, state.savedPlan);
const loaded = () => state.scenarios.find((s) => s.id === state.loadedId) ?? null;
async function confirmDiscard() {
  if (!isDirty()) return true;
  return (await openDialog({
    title: 'Niezapisane zmiany',
    message: 'Masz niezapisane zmiany w planie. Odrzucić je?',
    okLabel: 'Odrzuć zmiany',
    cancelLabel: 'Wróć do planu',
  })) === true;
}

function commit(next) {
  state.scenarios = next;
  const res = saveScenarios(next);
  if (!res.ok) toast(res.error);
}

// ---------- Powiadomienia ----------

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 4000);
}

// ---------- Planer: referencje do elementów ----------

const refs = {};
for (const id of CHANNEL_IDS) {
  const row = $(`[data-row="${id}"]`);
  refs[id] = {
    lock: row.querySelector('.lock'),
    range: row.querySelector('.share-range'),
    num: row.querySelector('.share-num'),
    roi: row.querySelector('.roi-num'),
    badge: row.querySelector('.lock-badge'),
    amount: row.querySelector('[data-out="amount"]'),
    profit: row.querySelector('[data-out="profit"]'),
    revenue: row.querySelector('[data-out="revenue"]'),
  };
}

function fillPresetSelect() {
  const select = $('#preset');
  select.innerHTML = PRESETS.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
}

function renderPlanner() {
  const { plan } = state;
  const result = calculatePlan(plan);
  const warnings = planWarnings(plan);
  const preset = findPreset(plan.presetId);
  const modified = isModifiedFromPreset(plan);
  const remaining = result.remainingPct;

  // Pola wejściowe (pomijamy to, w którym użytkownik akurat pisze).
  setIfIdle($('#budget'), plan.totalBudget);
  setIfIdle($('#preset'), plan.presetId);
  for (const c of plan.channels) {
    const r = refs[c.id];
    setIfIdle(r.range, c.sharePct);
    setIfIdle(r.num, c.sharePct);
    setIfIdle(r.roi, c.roiPct);
    r.lock.checked = c.locked;
    r.badge.hidden = !c.locked;
  }
  setIfIdle($('#margin-pct'), plan.marginMode.grossMarginPct);
  $('#margin-on').checked = plan.marginMode.enabled;
  $('#margin-fields').hidden = !plan.marginMode.enabled;

  // Opisy i stany przycisków.
  $('#preset-desc').textContent = `${preset?.description ?? ''} `;
  $('#modified-note').hidden = !modified;
  $('#modified-note').textContent = modified ? `Plan zmieniony ręcznie względem presetu „${preset?.name ?? '–'}”.` : '';
  $('#restore').disabled = !modified;
  $('#balance').disabled = result.isBalanced;
  $('#balance-error').hidden = result.isBalanced;

  // Wyniki.
  $('[data-kpi="budget"]').textContent = formatPLN(result.allocatedBudget);
  $('[data-kpi="revenue"]').textContent = formatPLN(result.totalRevenue);
  $('[data-kpi="profit"]').textContent = formatPLN(result.totalProfit);
  $('[data-kpi="roas"]').textContent = formatRoas(result.roas);
  $('[data-kpi="roi"]').textContent = formatPct(result.totalRoiPct);

  const sumStatus = $('#sum-status');
  sumStatus.className = `status ${result.isBalanced ? 'ok' : 'bad'}`;
  sumStatus.textContent = result.isBalanced
    ? 'Suma: 100% ✓'
    : remaining > 0
      ? `Pozostało ${formatPct(remaining)} do rozdysponowania`
      : `Przekroczono o ${formatPct(-remaining)}`;

  for (const r of result.channels) {
    const ref = refs[r.id];
    ref.amount.textContent = formatPLN(r.budget);
    ref.profit.textContent = formatPLN(r.profit);
    ref.revenue.textContent = formatPLN(r.revenue);
  }
  $('[data-out="sum-share"]').textContent = formatPct(result.shareSumPct);
  $('[data-out="total-amount"]').textContent = formatPLN(result.allocatedBudget);
  $('[data-out="total-roi"]').textContent = formatPct(result.totalRoiPct);
  $('[data-out="total-profit"]').textContent = formatPLN(result.totalProfit);
  $('[data-out="total-revenue"]').textContent = formatPLN(result.totalRevenue);

  $('#warnings').innerHTML = warnings.map((w) => `<div class="alert warn">${esc(w.message)}</div>`).join('');

  $('#margin-result').textContent = formatPct(result.totalRoiMarginPct ?? 0);

  // Wykresy.
  const donut = result.channels.map((c) => ({
    id: c.id,
    name: CHANNELS[c.id].name,
    value: c.budget,
    sharePct: c.sharePct,
  }));
  const donutWrap = $('#donut');
  donutWrap.setAttribute('role', 'img');
  donutWrap.setAttribute(
    'aria-label',
    'Podział budżetu: ' + donut.map((d) => `${d.name} ${formatPct(d.sharePct)}`).join(', '),
  );
  donutWrap.innerHTML =
    `<div class="chart-box">${donutChart(donut, formatPLN)}</div>` +
    `<ul class="legend">${donut
      .map(
        (d) =>
          `<li><span class="swatch ${d.id}" aria-hidden="true"></span>${esc(d.name)}: ${formatPct(d.sharePct)} · ${formatPLN(d.value)}</li>`,
      )
      .join('')}</ul>`;

  const barsWrap = $('#bars');
  barsWrap.setAttribute('role', 'img');
  barsWrap.setAttribute('aria-label', 'Budżet i przychód według kanałów');
  barsWrap.innerHTML =
    `<div class="chart-box">${groupedBars(
      result.channels.map((c) => ({ label: CHANNELS[c.id].name, values: { budget: c.budget, revenue: c.revenue } })),
      [
        { key: 'budget', label: 'Budżet', color: 'var(--text-muted)' },
        { key: 'revenue', label: 'Przychód', color: 'var(--accent)' },
      ],
      { format: formatPLN, tick: compactPLN, width: chartWidth(barsWrap) },
    )}</div>` +
    `<ul class="legend"><li><span class="swatch-sq" style="background: var(--text-muted)"></span>Budżet</li><li><span class="swatch-sq" style="background: var(--accent)"></span>Przychód</li></ul>`;

  renderSaveBox(result.isBalanced);
  renderHeader();
  updateTabBadges(warnings.length);
}

function renderSaveBox(isBalanced) {
  const cur = loaded();
  const nameInput = $('#scen-name');
  const dirty = isDirty();
  $('#save-title').textContent = cur ? `Scenariusz: ${cur.name}` : 'Zapisz jako scenariusz';
  nameInput.placeholder = cur ? cur.name : 'np. Wariant A – więcej social';
  $('#dirty-note').hidden = !(cur && dirty);
  $('#save-update').hidden = !cur;
  $('#save-update').disabled = !isBalanced || !dirty;
  $('#save-new').disabled = !isBalanced || nameInput.value.trim() === '';
}

function renderHeader() {
  const cur = loaded();
  const parts = ['Roczny budżet marketingowy: social media, WWW, radio', cur ? `scenariusz: ${cur.name}` : 'plan bez zapisu'];
  if (isDirty()) parts.push('niezapisane zmiany');
  $('#header-status').textContent = parts.join(' · ');
}

function updateTabBadges(warnCount) {
  const w = $('#warn-count');
  w.hidden = warnCount === 0;
  w.textContent = String(warnCount);
  const s = $('#scen-count');
  s.hidden = state.scenarios.length === 0;
  s.textContent = String(state.scenarios.length);
}

function showSaveError(message) {
  const el = $('#save-error');
  el.textContent = message;
  el.hidden = !message;
}

function handleSave(asNew) {
  const { plan } = state;
  const name = $('#scen-name').value.trim();
  const note = $('#scen-note').value.trim();
  if (!calculatePlan(plan).isBalanced) return showSaveError('Suma udziałów musi wynosić 100%.');

  const cur = loaded();
  if (!asNew && cur) {
    const finalName = name || cur.name;
    if (state.scenarios.some((s) => s.id !== cur.id && s.name === finalName)) {
      return showSaveError('Scenariusz o tej nazwie już istnieje.');
    }
    const updated = {
      ...cur,
      ...clonePlan(plan),
      name: finalName,
      note: note || cur.note,
      updatedAt: new Date().toISOString(),
    };
    commit(state.scenarios.map((s) => (s.id === cur.id ? updated : s)));
    state.savedPlan = clonePlan(plan);
    showSaveError('');
    toast(`Zapisano zmiany w scenariuszu „${finalName}”.`);
    return refreshAll();
  }

  if (name === '') return showSaveError('Podaj nazwę scenariusza.');
  if (name.length > LIMITS.nameMax) return showSaveError(`Nazwa może mieć maksymalnie ${LIMITS.nameMax} znaków.`);
  if (note.length > LIMITS.noteMax) return showSaveError(`Notatka może mieć maksymalnie ${LIMITS.noteMax} znaków.`);
  if (state.scenarios.some((s) => s.name === name)) return showSaveError('Scenariusz o tej nazwie już istnieje.');

  const created = createScenario(plan, name, note);
  commit([...state.scenarios, created]);
  state.loadedId = created.id;
  state.savedPlan = clonePlan(plan);
  $('#scen-name').value = '';
  $('#scen-note').value = '';
  showSaveError('');
  toast(`Zapisano scenariusz „${name}”.`);
  refreshAll();
}

// ---------- Zdarzenia planera ----------

function bindPlanner() {
  $('#budget').addEventListener('input', (e) => {
    const v = e.target.valueAsNumber;
    if (!Number.isFinite(v)) return;
    state.plan = setBudget(state.plan, v);
    refreshAll();
  });
  $('#preset').addEventListener('change', (e) => {
    state.plan = applyPreset(state.plan, e.target.value);
    state.lastEdited = null;
    refreshAll();
  });
  $('#restore').addEventListener('click', () => {
    state.plan = applyPreset(state.plan, state.plan.presetId);
    state.lastEdited = null;
    refreshAll();
  });

  for (const id of CHANNEL_IDS) {
    const r = refs[id];
    const onShare = (e) => {
      const v = e.target.valueAsNumber;
      if (!Number.isFinite(v)) return;
      state.plan = updateChannel(state.plan, id, { sharePct: v });
      state.lastEdited = id;
      refreshAll();
    };
    r.range.addEventListener('input', onShare);
    r.num.addEventListener('input', onShare);
    r.roi.addEventListener('input', (e) => {
      const v = e.target.valueAsNumber;
      if (!Number.isFinite(v)) return;
      state.plan = updateChannel(state.plan, id, { roiPct: v });
      refreshAll();
    });
    r.lock.addEventListener('change', (e) => {
      state.plan = updateChannel(state.plan, id, { locked: e.target.checked });
      refreshAll();
    });
  }

  $('#balance').addEventListener('click', () => {
    state.plan = balance(state.plan, state.lastEdited);
    refreshAll();
  });

  $('#margin-on').addEventListener('change', (e) => {
    state.plan = setMargin(state.plan, { enabled: e.target.checked });
    refreshAll();
  });
  $('#margin-pct').addEventListener('input', (e) => {
    const v = e.target.valueAsNumber;
    if (!Number.isFinite(v)) return;
    state.plan = setMargin(state.plan, { grossMarginPct: v });
    refreshAll();
  });

  $('#scen-name').addEventListener('input', () => renderSaveBox(calculatePlan(state.plan).isBalanced));
  $('#save-new').addEventListener('click', () => handleSave(true));
  $('#save-update').addEventListener('click', () => handleSave(false));

  $('#new-plan').addEventListener('click', async () => {
    if (!(await confirmDiscard())) return;
    const fresh = planFromPreset(DEFAULT_PRESET_ID, state.plan.totalBudget);
    state.plan = fresh;
    state.savedPlan = clonePlan(fresh);
    state.loadedId = null;
    state.lastEdited = null;
    showTab('planner');
  });
}

// ---------- Zakładki ----------

function showTab(tab) {
  state.tab = tab;
  for (const t of ['planner', 'scenarios', 'compare', 'about']) {
    const btn = $(`#tab-${t}`);
    btn.setAttribute('aria-selected', String(t === tab));
    btn.tabIndex = t === tab ? 0 : -1;
    const view = $(`#view-${t}`);
    view.hidden = t !== tab;
  }
  $('main').setAttribute('aria-labelledby', `tab-${tab}`);
  if (tab === 'planner') refreshAll();
  if (tab === 'scenarios') renderScenarios();
  if (tab === 'compare') renderCompare();
}

function refreshAll() {
  renderPlanner();
  if (state.tab === 'scenarios') renderScenarios();
  if (state.tab === 'compare') renderCompare();
}

// ---------- Scenariusze ----------

async function openScenario(id) {
  const s = state.scenarios.find((x) => x.id === id);
  if (!s || !(await confirmDiscard())) return;
  const next = clonePlan(s);
  state.plan = next;
  state.savedPlan = clonePlan(next);
  state.loadedId = s.id;
  state.lastEdited = null;
  showTab('planner');
}

async function renameScenario(id) {
  const s = state.scenarios.find((x) => x.id === id);
  const next = await openDialog({
    title: 'Zmień nazwę scenariusza',
    message: `Maksymalnie ${LIMITS.nameMax} znaków.`,
    input: s.name,
    okLabel: 'Zapisz nazwę',
    cancelLabel: 'Anuluj',
  });
  if (next === null) return;
  const name = next.trim();
  if (name === '') return toast('Nazwa nie może być pusta.');
  if (name.length > LIMITS.nameMax) return toast(`Nazwa może mieć maksymalnie ${LIMITS.nameMax} znaków.`);
  if (state.scenarios.some((x) => x.id !== id && x.name === name)) return toast('Scenariusz o tej nazwie już istnieje.');
  commit(state.scenarios.map((x) => (x.id === id ? { ...x, name, updatedAt: new Date().toISOString() } : x)));
  refreshAll();
}

async function deleteScenario(id) {
  const s = state.scenarios.find((x) => x.id === id);
  const ok = await openDialog({
    title: 'Usunąć scenariusz?',
    message: `„${s.name}” zniknie i nie da się tego cofnąć.`,
    okLabel: 'Usuń',
    cancelLabel: 'Anuluj',
  });
  if (ok !== true) return;
  commit(state.scenarios.filter((x) => x.id !== id));
  state.compareIds = state.compareIds.filter((x) => x !== id);
  if (state.loadedId === id) state.loadedId = null;
  refreshAll();
}

function toggleCompare(id) {
  if (state.compareIds.includes(id)) {
    state.compareIds = state.compareIds.filter((x) => x !== id);
  } else if (state.compareIds.length < LIMITS.compareMax) {
    state.compareIds = [...state.compareIds, id];
  }
  renderScenarios();
}

function exportScenarios() {
  const selected = state.scenarios.filter((s) => state.compareIds.includes(s.id));
  const list = selected.length > 0 ? selected : state.scenarios;
  const json = JSON.stringify(buildExportFile(list), null, 2);
  openDialog({
    title: `Eksport: ${list.length} scenariusz(y)`,
    message: 'Skopiuj tekst i zapisz go w pliku z rozszerzeniem .json. Import wczytuje taki plik z zakładki „Scenariusze”.',
    textarea: json,
    okLabel: 'Zamknij',
    cancelLabel: '',
    copy: true,
  });
}

async function handleImportFile(file) {
  if (!file) return;
  state.importError = null;
  state.pendingImport = null;
  const parsed = parseImportFile(await file.text());
  if (!parsed.ok) {
    state.importError = parsed.error;
  } else {
    const conflicts = findNameConflicts(state.scenarios, parsed.scenarios);
    if (conflicts.length === 0) {
      commit(mergeImported(state.scenarios, parsed.scenarios, 'keep-both'));
      toast(`Zaimportowano ${parsed.scenarios.length} scenariusz(y).`);
    } else {
      state.pendingImport = { scenarios: parsed.scenarios, conflicts };
    }
  }
  renderScenarios();
}

function resolveImport(strategy) {
  if (!state.pendingImport) return;
  commit(mergeImported(state.scenarios, state.pendingImport.scenarios, strategy));
  toast(`Zaimportowano ${state.pendingImport.scenarios.length} scenariusz(y).`);
  state.pendingImport = null;
  renderScenarios();
}

function renderScenarios() {
  const view = $('#view-scenarios');
  const all = state.scenarios;
  const canCompare = state.compareIds.length >= LIMITS.compareMin && state.compareIds.length <= LIMITS.compareMax;
  const selectedCount = state.compareIds.length;

  const pending = state.pendingImport
    ? `<div class="alert warn" role="alert">
         <p style="margin: 0 0 0.5rem">W pliku są scenariusze o nazwach, które już istnieją (${esc(state.pendingImport.conflicts.join(', '))}). Co zrobić?</p>
         <div class="row">
           <button type="button" data-strategy="replace">Zastąp istniejące</button>
           <button type="button" data-strategy="keep-both">Dodaj jako kopie</button>
           <button type="button" data-strategy="skip">Pomiń duplikaty</button>
           <button type="button" data-strategy="cancel">Anuluj</button>
         </div>
       </div>`
    : '';

  const rows = all
    .map((s) => {
      const checked = state.compareIds.includes(s.id);
      const disabled = !checked && selectedCount >= LIMITS.compareMax;
      const r = calculatePlan(s);
      return `<tr>
        <td class="check-cell"><input type="checkbox" data-compare="${s.id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} aria-label="Porównaj scenariusz ${esc(s.name)}" /></td>
        <td>
          <div class="scenario-name"><span>${esc(s.name)}</span>${state.loadedId === s.id ? '<span class="badge">otwarty</span>' : ''}</div>
          ${s.note ? `<div class="muted">${esc(s.note)}</div>` : ''}
        </td>
        <td>${formatDate(s.updatedAt)}</td>
        <td class="num">${formatPLN(r.allocatedBudget)}</td>
        <td class="num">${formatPct(r.totalRoiPct)}</td>
        <td><div class="row" style="gap: 0.4rem">
          <button type="button" data-action="open" data-id="${s.id}">Otwórz</button>
          <button type="button" data-action="rename" data-id="${s.id}">Zmień nazwę</button>
          <button type="button" data-action="duplicate" data-id="${s.id}">Duplikuj</button>
          <button type="button" class="danger" data-action="delete" data-id="${s.id}">Usuń</button>
        </div></td>
      </tr>`;
    })
    .join('');

  view.innerHTML = `
    <div class="card">
      <div class="card-title">
        <h2 id="scenarios-title">Zapisane scenariusze (${all.length})</h2>
        <button type="button" class="primary" data-action="compare" ${canCompare ? '' : 'disabled'}>Porównaj zaznaczone (${selectedCount})</button>
      </div>
      <p class="muted">Zaznacz od ${LIMITS.compareMin} do ${LIMITS.compareMax} scenariuszy, aby je porównać. Scenariusze są zapisane lokalnie w tej przeglądarce – eksportuj je do pliku, żeby nie stracić danych.</p>
      <div class="row" style="margin-bottom: 0.75rem">
        <button type="button" data-action="export" ${all.length === 0 ? 'disabled' : ''}>${
          selectedCount > 0 ? `Eksportuj zaznaczone (${selectedCount}) do JSON` : 'Eksportuj wszystkie do JSON'
        }</button>
        <label class="field">Import z pliku JSON
          <input type="file" id="import-file" accept="application/json,.json" />
        </label>
      </div>
      ${state.importError ? `<div class="alert error" role="alert">${esc(state.importError)} Istniejące scenariusze nie zostały zmienione.</div>` : ''}
      ${pending}
      ${
        all.length === 0
          ? '<div class="empty"><p>Nie masz jeszcze zapisanych scenariuszy. Ustaw plan w zakładce „Planer” i zapisz go.</p></div>'
          : `<div class="table-wrap"><table>
              <thead><tr>
                <th scope="col" class="check-cell"><span class="sr-only">Porównaj</span></th>
                <th scope="col">Nazwa</th><th scope="col">Zmodyfikowano</th>
                <th scope="col" class="num">Budżet</th><th scope="col" class="num">ROI całkowite</th>
                <th scope="col">Akcje</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table></div>`
      }
    </div>`;
}

// ---------- Porównanie ----------

function renderCompare() {
  const view = $('#view-compare');
  const sel = state.scenarios.filter((s) => state.compareIds.includes(s.id));
  if (sel.length < LIMITS.compareMin) {
    view.innerHTML = `<div class="card empty"><p>Wybierz od ${LIMITS.compareMin} do ${LIMITS.compareMax} scenariuszy w zakładce „Scenariusze”.</p>
      <button type="button" data-action="back">Wróć do scenariuszy</button></div>`;
    return;
  }
  const results = new Map(sel.map((s) => [s.id, calculatePlan(s)]));
  const base = sel.find((s) => s.id === state.compareBaseId) ?? sel[0];
  const baseR = results.get(base.id);
  const bestRoi = Math.max(...sel.map((s) => results.get(s.id).totalRoiPct));
  const bestProfit = Math.max(...sel.map((s) => results.get(s.id).totalProfit));
  const budgets = new Set(sel.map((s) => results.get(s.id).allocatedBudget));

  const delta = (diff, fmt) => {
    if (Math.abs(diff) < 0.05) return { text: '±0', dir: 'flat' };
    return { text: fmt(diff), dir: diff > 0 ? 'up' : 'down' };
  };
  const chOf = (r, id) => r.channels.find((c) => c.id === id);

  const rowDefs = [
    { label: 'Budżet', v: (s, r) => r.allocatedBudget, fmt: formatPLN, dFmt: formatSignedPLN },
    ...CHANNEL_IDS.map((id) => ({
      label: `Udział: ${CHANNELS[id].name}`,
      v: (s, r) => chOf(r, id).sharePct,
      fmt: formatPct,
      dFmt: formatSignedPct,
    })),
    ...CHANNEL_IDS.map((id) => ({
      label: `ROI: ${CHANNELS[id].name}`,
      v: (s, r) => chOf(r, id).roiPct,
      fmt: formatPct,
      dFmt: formatSignedPct,
    })),
    { label: 'Przychód', v: (s, r) => r.totalRevenue, fmt: formatPLN, dFmt: formatSignedPLN },
    { label: 'Zysk', key: 'profit', v: (s, r) => r.totalProfit, fmt: formatPLN, dFmt: formatSignedPLN },
    { label: 'ROAS', v: (s, r) => r.roas, fmt: formatRoas },
    { label: 'ROI całkowite', key: 'roi', strong: true, v: (s, r) => r.totalRoiPct, fmt: formatPct, dFmt: formatSignedPct },
  ];
  const bodyRows = rowDefs
    .map((row) => {
      const cells = sel
        .map((s) => {
          const r = results.get(s.id);
          const value = row.v(s, r);
          let extra = '';
          if (row.key === 'roi' && value === bestRoi && sel.length > 1) extra = '<span class="badge">Najwyższy ROI</span>';
          if (row.key === 'profit' && value === bestProfit && sel.length > 1) extra = '<span class="badge">Najwyższy zysk</span>';
          let deltaHtml = '';
          if (s.id !== base.id && row.dFmt) {
            const d = delta(value - row.v(base, baseR), row.dFmt);
            const arrow = d.dir === 'up' ? '▲ ' : d.dir === 'down' ? '▼ ' : '';
            deltaHtml = `<div class="delta ${d.dir}">${arrow}${esc(d.text)}</div>`;
          }
          return `<td class="num">${esc(row.fmt(value))}${extra}${deltaHtml}</td>`;
        })
        .join('');
      return `<tr${row.strong ? ' style="font-weight: 600"' : ''}><th scope="row">${esc(row.label)}</th>${cells}</tr>`;
    })
    .join('');

  const headCells = sel
    .map(
      (s) => `<th scope="col" class="num">${esc(s.name)}${s.id === base.id ? '<span class="badge">baza</span>' : ''}
        <div class="muted" style="font-weight: 400">${formatDate(s.updatedAt)}</div></th>`,
    )
    .join('');

  const radios = sel
    .map(
      (s) => `<label class="badge" style="cursor: pointer; padding: 0.3rem 0.7rem">
        <input type="radio" name="base" value="${s.id}" ${s.id === base.id ? 'checked' : ''} style="margin-right: 0.35rem" />${esc(s.name)}</label>`,
    )
    .join('');


  view.innerHTML = `
    <div class="card-title" style="margin-bottom: 0.75rem">
      <h2 id="compare-title">Porównanie scenariuszy</h2>
      <button type="button" data-action="back">Wróć do scenariuszy</button>
    </div>

    <div class="card">
      <div class="row" style="align-items: center">
        <span class="muted">Scenariusz bazowy (Δ liczone względem niego):</span>
        <div role="radiogroup" aria-label="Scenariusz bazowy" class="row" style="gap: 0.5rem">${radios}</div>
      </div>
      ${budgets.size > 1 ? '<div class="alert warn">Scenariusze mają różne budżety, więc zysk w PLN nie jest wprost porównywalny. Patrz przede wszystkim na ROI.</div>' : ''}
    </div>

    <div class="card table-wrap">
      <table>
        <thead><tr><th scope="col">Wskaźnik</th>${headCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>

    <div class="grid-2">
      <div class="card"><h2>ROI całkowite</h2><div role="img" aria-label="ROI całkowite: ${esc(sel.map((s) => `${s.name} ${formatPct(results.get(s.id).totalRoiPct)}`).join(', '))}"><div class="chart-box" data-chart="roi"></div></div></div>
      <div class="card"><h2>Zysk (PLN)</h2><div role="img" aria-label="Zysk: ${esc(sel.map((s) => `${s.name} ${formatPLN(results.get(s.id).totalProfit)}`).join(', '))}"><div class="chart-box" data-chart="profit"></div></div></div>
    </div>

    <div class="card">
      <h2>Struktura budżetu (udział kanałów)</h2>
      <div role="img" aria-label="Struktura budżetu w scenariuszach"><div class="chart-box" data-chart="structure"></div></div>
      <ul class="legend">${CHANNEL_IDS.map((id) => `<li><span class="swatch ${id}" aria-hidden="true"></span>${CHANNELS[id].name}</li>`).join('')}</ul>
    </div>`;
  state.compareBaseId = base.id;

  const fill = (name, build) => {
    const el = view.querySelector(`[data-chart="${name}"]`);
    el.innerHTML = build(chartWidth(el));
  };
  fill('roi', (width) =>
    groupedBars(
      sel.map((s) => ({ label: s.name, values: { roi: results.get(s.id).totalRoiPct } })),
      [{ key: 'roi', label: 'ROI całkowite', color: 'var(--accent)' }],
      { format: formatPct, tick: (v) => `${Math.round(v)}%`, width },
    ),
  );
  fill('profit', (width) =>
    groupedBars(
      sel.map((s) => ({ label: s.name, values: { profit: results.get(s.id).totalProfit } })),
      [{ key: 'profit', label: 'Zysk', color: 'var(--accent)' }],
      { format: formatPLN, tick: compactPLN, width },
    ),
  );
  fill('structure', (width) =>
    stackedShareBars(
      sel.map((s) => {
        const r = results.get(s.id);
        return { label: s.name, values: Object.fromEntries(CHANNEL_IDS.map((id) => [id, chOf(r, id).sharePct])) };
      }),
      { width },
    ),
  );
}

// ---------- Zdarzenia zakładek i widoków dynamicznych ----------

function bindViews() {
  $$('[role="tab"]').forEach((btn) => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  const scen = $('#view-scenarios');
  scen.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id, strategy } = btn.dataset;
    if (strategy) {
      if (strategy === 'cancel') {
        state.pendingImport = null;
        renderScenarios();
      } else {
        resolveImport(strategy);
      }
      return;
    }
    if (action === 'open') openScenario(id);
    if (action === 'rename') renameScenario(id);
    if (action === 'duplicate') {
      const s = state.scenarios.find((x) => x.id === id);
      commit([...state.scenarios, duplicateScenario(s, state.scenarios)]);
      toast(`Utworzono kopię „${s.name}”.`);
      renderScenarios();
    }
    if (action === 'delete') deleteScenario(id);
    if (action === 'export') exportScenarios();
    if (action === 'compare') showTab('compare');
  });
  scen.addEventListener('change', (e) => {
    if (e.target.matches('[data-compare]')) toggleCompare(e.target.dataset.compare);
    if (e.target.id === 'import-file') handleImportFile(e.target.files?.[0]);
  });

  const cmp = $('#view-compare');
  cmp.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="back"]')) showTab('scenarios');
  });
  cmp.addEventListener('change', (e) => {
    if (e.target.name === 'base') {
      state.compareBaseId = e.target.value;
      renderCompare();
    }
  });
}

function renderAbout() {
  $('#about-presets').innerHTML = PRESETS.map(
    (p) => `<li><strong>${esc(p.name)}</strong> – ${esc(p.description)}</li>`,
  ).join('');
}

// ---------- Start ----------

function init() {
  fillPresetSelect();
  renderAbout();
  bindPlanner();
  bindViews();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.tab === 'planner') renderPlanner();
      if (state.tab === 'compare') renderCompare();
    }, 150);
  });
  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) e.preventDefault();
  });
  showTab('planner');
}

init();
