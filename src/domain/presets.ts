import type { ChannelId, ChannelInput, Plan } from './types';

export interface Preset {
  id: string;
  name: string;
  description: string;
  values: Record<ChannelId, { sharePct: number; roiPct: number }>;
}

/** Presety z PRD, sekcja 5.2. Wartości ROI to założenia startowe, nie dane rynkowe. */
export const PRESETS: readonly Preset[] = [
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
export const CUSTOM_PRESET_ID = 'custom';

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function presetChannels(preset: Preset): ChannelInput[] {
  return (Object.keys(preset.values) as ChannelId[]).map((id) => ({
    id,
    sharePct: preset.values[id].sharePct,
    roiPct: preset.values[id].roiPct,
    locked: false,
  }));
}

export function planFromPreset(presetId: string, totalBudget = DEFAULT_BUDGET): Plan {
  const preset = findPreset(presetId) ?? findPreset(DEFAULT_PRESET_ID)!;
  return {
    currency: 'PLN',
    totalBudget,
    presetId: preset.id,
    marginMode: { enabled: false, grossMarginPct: 40 },
    channels: presetChannels(preset),
  };
}
