export type ChannelId = 'social' | 'www' | 'radio';

export const CHANNEL_IDS: readonly ChannelId[] = ['social', 'www', 'radio'];

export interface ChannelInput {
  id: ChannelId;
  /** Udział w budżecie, %, dokładność 0,1. */
  sharePct: number;
  /** Zakładany ROI, %, od −100 do 1000. */
  roiPct: number;
  locked: boolean;
}

export interface MarginMode {
  enabled: boolean;
  grossMarginPct: number;
}

/** Edytowalne dane planu (to, co zapisujemy w scenariuszu). */
export interface Plan {
  currency: 'PLN';
  totalBudget: number;
  presetId: string;
  marginMode: MarginMode;
  channels: ChannelInput[];
}

export interface Scenario extends Plan {
  schemaVersion: 1;
  id: string;
  name: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export const LIMITS = {
  budgetMax: 1_000_000_000,
  roiMin: -100,
  roiMax: 1000,
  nameMax: 60,
  noteMax: 500,
  compareMin: 2,
  compareMax: 4,
} as const;
