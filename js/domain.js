// Logika aplikacji (PRD, sekcja 4 i 5). Bez zależności od DOM – działa w przeglądarce i w Node.

export const CHANNEL_IDS = ['social', 'www', 'radio'];

export const LIMITS = {
  budgetMax: 1_000_000_000,
  roiMin: -100,
  roiMax: 1000,
  nameMax: 60,
  noteMax: 500,
  compareMin: 2,
  compareMax: 4,
};

// Zalecane widełki udziału (PRD 5.3) – ostrzeżenie, nie blokada.
export const CHANNELS = {
  social: {
    name: 'Social media',
    description: 'Płatne kampanie i prowadzenie profili (Meta, Instagram, TikTok, LinkedIn).',
    minPct: 20,
    maxPct: 60,
  },
  www: {
    name: 'WWW',
    description: 'Strona i sklep, SEO, content, Google Ads (wyszukiwarka), e-mail marketing przez stronę.',
    minPct: 20,
    maxPct: 65,
  },
  radio: {
    name: 'Radio',
    description: 'Spoty w radiu lokalnym lub ogólnopolskim, sponsoring audycji, radio internetowe.',
    minPct: 0,
    maxPct: 35,
  },
};

// Presety z PRD, sekcja 5.2. Wartości ROI to założenia startowe, nie dane rynkowe.
export const PRESETS = [
  {
    id: 'balanced',
    name: 'Zrównoważony',
    description: 'Uniwersalny punkt startowy dla większości firm.',
    values: {
      social: { sharePct: 45, roiPct: 150 },
      www: { sharePct: 35, roiPct: 200 },
      radio: { sharePct: 20, roiPct: 80 },
    },
  },
  {
    id: 'local-b2c',
    name: 'Lokalna firma B2C',
    description: 'Sklep, usługi lub gastronomia w jednym regionie – radio daje lokalny zasięg.',
    values: {
      social: { sharePct: 40, roiPct: 180 },
      www: { sharePct: 30, roiPct: 220 },
      radio: { sharePct: 30, roiPct: 90 },
    },
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Sprzedaż online w całej Polsce – dominują social media i strona.',
    values: {
      social: { sharePct: 50, roiPct: 200 },
      www: { sharePct: 40, roiPct: 300 },
      radio: { sharePct: 10, roiPct: 50 },
    },
  },
  {
    id: 'b2b',
    name: 'B2B',
    description: 'Długi cykl sprzedaży – strona, SEO i treści są najważniejsze.',
    values: {
      social: { sharePct: 30, roiPct: 120 },
      www: { sharePct: 60, roiPct: 250 },
      radio: { sharePct: 10, roiPct: 30 },
    },
  },
];

export const DEFAULT_PRESET_ID = 'balanced';
export const DEFAULT_BUDGET = 500_000;

export const findPreset = (id) => PRESETS.find((p) => p.id === id);

export function planFromPreset(presetId, totalBudget = DEFAULT_BUDGET) {
  const preset = findPreset(presetId) ?? findPreset(DEFAULT_PRESET_ID);
  return {
    currency: 'PLN',
    totalBudget,
    presetId: preset.id,
    marginMode: { enabled: false, grossMarginPct: 40 },
    channels: CHANNEL_IDS.map((id) => ({
      id,
      sharePct: preset.values[id].sharePct,
      roiPct: preset.values[id].roiPct,
      locked: false,
    })),
  };
}

// ---------- Obliczenia (liczby całkowite: grosze i dziesiąte części procenta) ----------

export const toTenths = (pct) => Math.round(pct * 10);
export const fromTenths = (tenths) => tenths / 10;
const toGrosze = (pln) => Math.round(pln * 100);
const toPln = (gr) => gr / 100;

/** Dzieli budżet (grosze) na kwoty kanałów. Przy sumie 100% reszta z zaokrągleń trafia do największego kanału. */
export function allocateGrosze(budgetGr, sharesTenths) {
  const total = sharesTenths.reduce((a, b) => a + b, 0);
  if (total !== 1000) {
    return sharesTenths.map((t) => Math.round((budgetGr * t) / 1000));
  }
  const amounts = sharesTenths.map((t) => Math.floor((budgetGr * t) / 1000));
  const remainder = budgetGr - amounts.reduce((a, b) => a + b, 0);
  if (remainder !== 0) {
    let largest = 0;
    sharesTenths.forEach((t, i) => {
      if (t > sharesTenths[largest]) largest = i;
    });
    amounts[largest] += remainder;
  }
  return amounts;
}

function marginRoi(revenueGr, budgetGr, marginPct) {
  if (budgetGr === 0) return null;
  return ((revenueGr * marginPct) / 100 - budgetGr) / budgetGr * 100;
}

export function calculatePlan(plan) {
  const budgetGr = toGrosze(Math.max(0, plan.totalBudget));
  const sharesTenths = plan.channels.map((c) => toTenths(c.sharePct));
  const amountsGr = allocateGrosze(budgetGr, sharesTenths);
  const profitsGr = plan.channels.map((c, i) => Math.round((amountsGr[i] * c.roiPct) / 100));

  const allocatedGr = amountsGr.reduce((a, b) => a + b, 0);
  const totalProfitGr = profitsGr.reduce((a, b) => a + b, 0);
  const totalRevenueGr = allocatedGr + totalProfitGr;
  const margin = plan.marginMode.enabled ? plan.marginMode.grossMarginPct : null;

  const channels = plan.channels.map((c, i) => {
    const revenueGr = amountsGr[i] + profitsGr[i];
    return {
      id: c.id,
      sharePct: fromTenths(sharesTenths[i]),
      roiPct: c.roiPct,
      budget: toPln(amountsGr[i]),
      profit: toPln(profitsGr[i]),
      revenue: toPln(revenueGr),
      profitSharePct: totalProfitGr === 0 ? null : (profitsGr[i] / totalProfitGr) * 100,
      roiMarginPct: margin === null ? null : marginRoi(revenueGr, amountsGr[i], margin),
    };
  });

  const shareSum = sharesTenths.reduce((a, b) => a + b, 0);
  return {
    channels,
    allocatedBudget: toPln(allocatedGr),
    shareSumPct: fromTenths(shareSum),
    remainingPct: fromTenths(1000 - shareSum),
    isBalanced: shareSum === 1000,
    totalProfit: toPln(totalProfitGr),
    totalRevenue: toPln(totalRevenueGr),
    totalRoiPct: allocatedGr === 0 ? 0 : (totalProfitGr / allocatedGr) * 100,
    roas: allocatedGr === 0 ? 0 : totalRevenueGr / allocatedGr,
    totalRoiMarginPct: margin === null ? null : marginRoi(totalRevenueGr, allocatedGr, margin),
  };
}

export function shareFromAmount(amount, totalBudget) {
  if (totalBudget <= 0) return 0;
  return fromTenths(toTenths((amount / totalBudget) * 100));
}

// ---------- Przydział przy „Wyrównaj do 100%” ----------

/** Dzieli `amount` (liczba całkowita) proporcjonalnie do wag metodą największych reszt. */
export function largestRemainder(amount, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  const effective = total > 0 ? weights : weights.map(() => 1);
  const effTotal = total > 0 ? total : weights.length;
  const exact = effective.map((w) => (amount * w) / effTotal);
  const result = exact.map(Math.floor);
  let rest = amount - result.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0 && k < order.length; k++, rest--) {
    result[order[k].i] += 1;
  }
  return result;
}

/** Różnicę do 100% rozkłada na niezablokowane kanały; najpierw pomija ostatnio edytowany. */
export function rebalance(channels, lastEditedId) {
  const tenths = channels.map((c) => toTenths(c.sharePct));
  let diff = 1000 - tenths.reduce((a, b) => a + b, 0);

  const unlocked = channels.map((c, i) => ({ c, i })).filter(({ c }) => !c.locked);
  const pools = [
    unlocked.filter(({ c }) => c.id !== lastEditedId).map(({ i }) => i),
    unlocked.filter(({ c }) => c.id === lastEditedId).map(({ i }) => i),
  ];

  for (const pool of pools) {
    if (diff === 0) break;
    if (pool.length === 0) continue;
    const weights = pool.map((i) => tenths[i]);
    if (diff > 0) {
      largestRemainder(diff, weights).forEach((add, k) => (tenths[pool[k]] += add));
      diff = 0;
    } else {
      const capacity = weights.reduce((a, b) => a + b, 0);
      const take = Math.min(-diff, capacity);
      largestRemainder(take, weights).forEach((sub, k) => (tenths[pool[k]] -= sub));
      diff += take;
    }
  }

  return {
    channels: channels.map((c, i) => ({ ...c, sharePct: fromTenths(tenths[i]) })),
    ok: diff === 0,
  };
}

// ---------- Edycja planu ----------

const round1 = (v) => Math.round(v * 10) / 10;

export function clonePlan(plan) {
  return {
    currency: plan.currency,
    totalBudget: plan.totalBudget,
    presetId: plan.presetId,
    marginMode: { ...plan.marginMode },
    channels: plan.channels.map((c) => ({ ...c })),
  };
}

export const plansEqual = (a, b) => JSON.stringify(clonePlan(a)) === JSON.stringify(clonePlan(b));

export function setBudget(plan, value) {
  if (!Number.isFinite(value)) return plan;
  return { ...plan, totalBudget: Math.min(Math.max(value, 0), LIMITS.budgetMax) };
}

/** Zmiana presetu zachowuje budżet i ustawienia marży. */
export function applyPreset(plan, presetId) {
  const fresh = planFromPreset(presetId, plan.totalBudget);
  return { ...fresh, marginMode: plan.marginMode };
}

export function updateChannel(plan, id, patch) {
  const clean = { ...patch };
  if (clean.sharePct !== undefined) {
    if (!Number.isFinite(clean.sharePct)) return plan;
    clean.sharePct = Math.min(Math.max(round1(clean.sharePct), 0), 100);
  }
  if (clean.roiPct !== undefined) {
    if (!Number.isFinite(clean.roiPct)) return plan;
    clean.roiPct = Math.min(Math.max(clean.roiPct, LIMITS.roiMin), LIMITS.roiMax);
  }
  return { ...plan, channels: plan.channels.map((c) => (c.id === id ? { ...c, ...clean } : c)) };
}

export function setMargin(plan, patch) {
  const next = { ...plan.marginMode, ...patch };
  if (next.grossMarginPct !== undefined && Number.isFinite(next.grossMarginPct)) {
    next.grossMarginPct = Math.min(Math.max(next.grossMarginPct, 0), 100);
  }
  return { ...plan, marginMode: next };
}

export function balance(plan, lastEdited) {
  return { ...plan, channels: rebalance(plan.channels, lastEdited).channels };
}

export function isModifiedFromPreset(plan) {
  const preset = findPreset(plan.presetId);
  if (!preset) return true;
  return plan.channels.some((c) => {
    const base = preset.values[c.id];
    return base.sharePct !== c.sharePct || base.roiPct !== c.roiPct;
  });
}

/** Ostrzeżenia (nie blokady): widełki udziałów i ujemne ROI (PRD 5.3, FR-09). */
export function planWarnings(plan) {
  const warnings = [];
  for (const c of plan.channels) {
    const meta = CHANNELS[c.id];
    if (c.sharePct < meta.minPct || c.sharePct > meta.maxPct) {
      warnings.push({
        channelId: c.id,
        message: `${meta.name}: udział ${c.sharePct}% poza typowym zakresem ${meta.minPct}–${meta.maxPct}% – rozważ ryzyko nasycenia lub zbyt małego zasięgu.`,
      });
    }
    if (c.roiPct < 0) {
      warnings.push({
        channelId: c.id,
        message: `${meta.name}: ujemne ROI (${c.roiPct}%) – kanał zwraca mniej, niż kosztuje.`,
      });
    }
  }
  return warnings;
}

// ---------- Scenariusze ----------

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createScenario(plan, name, note, now = new Date()) {
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

export function uniqueName(base, taken) {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const suffix = ` (${n})`;
    const candidate = base.slice(0, LIMITS.nameMax - suffix.length) + suffix;
    if (!taken.has(candidate)) return candidate;
  }
}

export function duplicateScenario(s, existing, now = new Date()) {
  const name = uniqueName(`${s.name} – kopia`.slice(0, LIMITS.nameMax), new Set(existing.map((e) => e.name)));
  return createScenario(s, name, s.note, now);
}

export const findNameConflicts = (existing, incoming) => {
  const names = new Set(existing.map((s) => s.name));
  return incoming.filter((s) => names.has(s.name)).map((s) => s.name);
};

/** Łączy importowane scenariusze z istniejącymi. Importowane dostają nowe id. */
export function mergeImported(existing, incoming, strategy) {
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

// ---------- Walidacja i import/eksport (zamiast zod) ----------

export const APP_ID = 'budget-roi-planner';

/** Zwraca komunikat błędu albo null, gdy scenariusz jest poprawny. */
export function validateScenario(s) {
  if (!s || typeof s !== 'object') return 'Wpis nie jest obiektem.';
  if (s.schemaVersion !== 1) return 'Nieobsługiwana wersja formatu.';
  if (typeof s.id !== 'string' || s.id === '') return 'Brak identyfikatora scenariusza.';
  if (typeof s.name !== 'string' || s.name.trim() === '' || s.name.length > LIMITS.nameMax) {
    return 'Nieprawidłowa nazwa scenariusza.';
  }
  if (typeof s.note !== 'string' || s.note.length > LIMITS.noteMax) return 'Nieprawidłowa notatka.';
  if (typeof s.createdAt !== 'string' || typeof s.updatedAt !== 'string') return 'Brak dat scenariusza.';
  if (s.currency !== 'PLN') return 'Nieobsługiwana waluta.';
  if (typeof s.totalBudget !== 'number' || !(s.totalBudget > 0) || s.totalBudget > LIMITS.budgetMax) {
    return 'Nieprawidłowy budżet.';
  }
  if (typeof s.presetId !== 'string') return 'Brak presetu.';
  if (!s.marginMode || typeof s.marginMode.enabled !== 'boolean') return 'Nieprawidłowe ustawienia marży.';
  if (typeof s.marginMode.grossMarginPct !== 'number' || s.marginMode.grossMarginPct < 0 || s.marginMode.grossMarginPct > 100) {
    return 'Nieprawidłowa marża brutto.';
  }
  if (!Array.isArray(s.channels) || s.channels.length !== CHANNEL_IDS.length) return 'Nieprawidłowa lista kanałów.';
  for (const id of CHANNEL_IDS) {
    if (!s.channels.some((c) => c && c.id === id)) return `Brak kanału ${id}.`;
  }
  for (const c of s.channels) {
    if (typeof c.sharePct !== 'number' || c.sharePct < 0 || c.sharePct > 100) return 'Nieprawidłowy udział kanału.';
    if (typeof c.roiPct !== 'number' || c.roiPct < LIMITS.roiMin || c.roiPct > LIMITS.roiMax) return 'Nieprawidłowe ROI kanału.';
    if (typeof c.locked !== 'boolean') return 'Nieprawidłowa blokada kanału.';
  }
  const sum = s.channels.reduce((acc, c) => acc + toTenths(c.sharePct), 0);
  if (sum !== 1000) return 'Suma udziałów kanałów musi wynosić 100%.';
  return null;
}

export function buildExportFile(scenarios, now = new Date()) {
  return { app: APP_ID, exportedAt: now.toISOString(), scenarios: [...scenarios] };
}

/** Parsuje plik importu. Nigdy nie rzuca wyjątku. */
export function parseImportFile(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Plik nie jest poprawnym plikiem JSON.' };
  }
  if (!json || json.app !== APP_ID || !Array.isArray(json.scenarios)) {
    return { ok: false, error: 'Plik nie pasuje do formatu scenariuszy tej aplikacji.' };
  }
  for (let i = 0; i < json.scenarios.length; i++) {
    const err = validateScenario(json.scenarios[i]);
    if (err) return { ok: false, error: `Scenariusz nr ${i + 1}: ${err}` };
  }
  return { ok: true, scenarios: json.scenarios };
}

// ---------- Formatowanie (polski) ----------

const plnFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });
const signedFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1, signDisplay: 'always' });
const dateFormatter = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });

export const formatPLN = (v) => plnFormatter.format(v);
export const formatPct = (v) => `${numberFormatter.format(v)}%`;
export const formatSignedPct = (v) => `${signedFormatter.format(v)} pp`;
export const formatSignedPLN = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${plnFormatter.format(Math.abs(v))}`;
export const formatRoas = (v) => `${numberFormatter.format(v)}×`;
export const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : dateFormatter.format(d);
};
/** Skrót kwoty do osi wykresu: 250tys / 1,2mln. */
export function compactPLN(v) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })}mln`;
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}tys`;
  return String(Math.round(v));
}
