import { shareFromAmount } from './calc';
import { CHANNELS } from './channels';
import { planFromPreset, findPreset } from './presets';
import { rebalance } from './rebalance';
import { LIMITS, type ChannelId, type ChannelInput, type Plan } from './types';

/** Zaokrąglenie do jednej dziesiątej (dokładność udziałów, FR-03). */
const round1 = (v: number): number => Math.round(v * 10) / 10;

export function setBudget(plan: Plan, value: number): Plan {
  if (!Number.isFinite(value)) return plan;
  return { ...plan, totalBudget: Math.min(Math.max(value, 0), LIMITS.budgetMax) };
}

/** Zmiana presetu zachowuje budżet i ustawienia marży. */
export function applyPreset(plan: Plan, presetId: string): Plan {
  const fresh = planFromPreset(presetId, plan.totalBudget);
  return { ...fresh, marginMode: plan.marginMode };
}

export function updateChannel(
  plan: Plan,
  id: ChannelId,
  patch: Partial<Pick<ChannelInput, 'sharePct' | 'roiPct' | 'locked'>>,
): Plan {
  const clean = { ...patch };
  if (clean.sharePct !== undefined) {
    if (!Number.isFinite(clean.sharePct)) return plan;
    clean.sharePct = Math.min(Math.max(round1(clean.sharePct), 0), 100);
  }
  if (clean.roiPct !== undefined) {
    if (!Number.isFinite(clean.roiPct)) return plan;
    clean.roiPct = Math.min(Math.max(clean.roiPct, LIMITS.roiMin), LIMITS.roiMax);
  }
  return {
    ...plan,
    channels: plan.channels.map((c) => (c.id === id ? { ...c, ...clean } : c)),
  };
}

/** Kwota w PLN zamiast procentu (FR-07, wpisana kwota przelicza udział). */
export function setAmount(plan: Plan, id: ChannelId, amount: number): Plan {
  if (!Number.isFinite(amount) || plan.totalBudget <= 0) return plan;
  const share = shareFromAmount(Math.min(Math.max(amount, 0), plan.totalBudget), plan.totalBudget);
  return updateChannel(plan, id, { sharePct: share });
}

export function setMargin(plan: Plan, patch: Partial<Plan['marginMode']>): Plan {
  const next = { ...plan.marginMode, ...patch };
  if (next.grossMarginPct !== undefined && Number.isFinite(next.grossMarginPct)) {
    next.grossMarginPct = Math.min(Math.max(next.grossMarginPct, 0), 100);
  }
  return { ...plan, marginMode: next };
}

export function balance(plan: Plan, lastEdited: ChannelId | null): Plan {
  return { ...plan, channels: rebalance(plan.channels, lastEdited).channels };
}

/** Czy plan odbiega od wartości presetu (dla przycisku „Przywróć preset”). */
export function isModifiedFromPreset(plan: Plan): boolean {
  const preset = findPreset(plan.presetId);
  if (!preset) return true;
  return plan.channels.some((c) => {
    const base = preset.values[c.id];
    return base.sharePct !== c.sharePct || base.roiPct !== c.roiPct;
  });
}

export interface PlanWarning {
  channelId: ChannelId | null;
  message: string;
}

/** Ostrzeżenia (nie blokady): widełki udziałów i ujemne ROI (PRD 5.3, FR-09). */
export function planWarnings(plan: Plan): PlanWarning[] {
  const warnings: PlanWarning[] = [];
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
