import type { ChannelId, ChannelInput, Plan } from './types';

/**
 * Moduł obliczeń (PRD, sekcja 4). Czysty – bez zależności od UI.
 *
 * Kwoty liczymy w groszach (liczby całkowite), udziały w dziesiątych częściach procenta,
 * żeby uniknąć błędów zmiennoprzecinkowych. Na wyjściu zwracamy złote.
 */

export interface ChannelResult {
  id: ChannelId;
  sharePct: number;
  roiPct: number;
  budget: number;
  profit: number;
  revenue: number;
  /** Udział kanału w zysku całkowitym, % (null, gdy zysk całkowity = 0). */
  profitSharePct: number | null;
  /** ROI liczony od marży (tryb „ROI na marży”), null gdy tryb wyłączony lub budżet kanału = 0. */
  roiMarginPct: number | null;
}

export interface PlanResult {
  channels: ChannelResult[];
  /** Suma kwot przydzielonych kanałom (równa budżetowi, gdy suma udziałów = 100%). */
  allocatedBudget: number;
  shareSumPct: number;
  /** 100 − suma udziałów (dodatnie: zostało do rozdzielenia, ujemne: przekroczono). */
  remainingPct: number;
  isBalanced: boolean;
  totalProfit: number;
  totalRevenue: number;
  /** ROI całkowite = zysk / budżet × 100% = Σ(wᵢ × ROIᵢ). */
  totalRoiPct: number;
  /** ROAS = przychód / budżet. */
  roas: number;
  totalRoiMarginPct: number | null;
}

export const toTenths = (pct: number): number => Math.round(pct * 10);
export const fromTenths = (tenths: number): number => tenths / 10;
const toGrosze = (pln: number): number => Math.round(pln * 100);
const toPln = (gr: number): number => gr / 100;

export function shareSumTenths(channels: readonly ChannelInput[]): number {
  return channels.reduce((sum, c) => sum + toTenths(c.sharePct), 0);
}

/**
 * Dzieli budżet na kanały. Gdy suma udziałów = 100%, suma kwot jest dokładnie równa budżetowi –
 * resztę z zaokrągleń dopisujemy do największego kanału (NFR-06).
 */
export function allocateGrosze(budgetGr: number, sharesTenths: readonly number[]): number[] {
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

function marginRoi(revenueGr: number, budgetGr: number, marginPct: number): number | null {
  if (budgetGr === 0) return null;
  return ((revenueGr * marginPct) / 100 - budgetGr) / budgetGr * 100;
}

export function calculatePlan(plan: Plan): PlanResult {
  const budgetGr = toGrosze(Math.max(0, plan.totalBudget));
  const sharesTenths = plan.channels.map((c) => toTenths(c.sharePct));
  const amountsGr = allocateGrosze(budgetGr, sharesTenths);
  const profitsGr = plan.channels.map((c, i) => Math.round((amountsGr[i] * c.roiPct) / 100));

  const allocatedGr = amountsGr.reduce((a, b) => a + b, 0);
  const totalProfitGr = profitsGr.reduce((a, b) => a + b, 0);
  const totalRevenueGr = allocatedGr + totalProfitGr;
  const margin = plan.marginMode.enabled ? plan.marginMode.grossMarginPct : null;

  const channels: ChannelResult[] = plan.channels.map((c, i) => {
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

/** Udział (%) odpowiadający kwocie kanału – do wpisywania kwoty zamiast procentu (FR-07). */
export function shareFromAmount(amount: number, totalBudget: number): number {
  if (totalBudget <= 0) return 0;
  return fromTenths(toTenths((amount / totalBudget) * 100));
}
