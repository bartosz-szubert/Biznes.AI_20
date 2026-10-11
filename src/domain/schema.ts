import { z } from 'zod';
import { toTenths } from './calc';
import { CHANNEL_IDS, LIMITS, type Scenario } from './types';

export const APP_ID = 'budget-roi-planner';

const channelSchema = z.object({
  id: z.enum(['social', 'www', 'radio']),
  sharePct: z.number().min(0).max(100),
  roiPct: z.number().min(LIMITS.roiMin).max(LIMITS.roiMax),
  locked: z.boolean().default(false),
});

export const scenarioSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    name: z.string().trim().min(1).max(LIMITS.nameMax),
    note: z.string().max(LIMITS.noteMax).default(''),
    createdAt: z.string(),
    updatedAt: z.string(),
    currency: z.literal('PLN'),
    totalBudget: z.number().positive().max(LIMITS.budgetMax),
    presetId: z.string(),
    marginMode: z
      .object({ enabled: z.boolean(), grossMarginPct: z.number().min(0).max(100) })
      .default({ enabled: false, grossMarginPct: 40 }),
    channels: z.array(channelSchema).length(CHANNEL_IDS.length),
  })
  .refine((s) => CHANNEL_IDS.every((id) => s.channels.some((c) => c.id === id)), {
    message: 'Scenariusz musi zawierać kanały social, www i radio.',
  })
  .refine((s) => s.channels.reduce((sum, c) => sum + toTenths(c.sharePct), 0) === 1000, {
    message: 'Suma udziałów kanałów musi wynosić 100%.',
  });

export const exportFileSchema = z.object({
  app: z.literal(APP_ID),
  exportedAt: z.string(),
  scenarios: z.array(scenarioSchema),
});

export type ExportFile = z.infer<typeof exportFileSchema>;

export function buildExportFile(scenarios: readonly Scenario[], now = new Date()): ExportFile {
  return { app: APP_ID, exportedAt: now.toISOString(), scenarios: [...scenarios] };
}

export type ParseResult = { ok: true; scenarios: Scenario[] } | { ok: false; error: string };

/** Parsuje i sprawdza plik importu (FR-36). Nigdy nie rzuca wyjątku. */
export function parseImportFile(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Plik nie jest poprawnym plikiem JSON.' };
  }
  const result = exportFileSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue.path.length ? ` (pole: ${issue.path.join('.')})` : '';
    return { ok: false, error: `Plik nie pasuje do formatu scenariuszy: ${issue.message}${where}.` };
  }
  // Ograniczenia schematu gwarantują zgodność z typem Scenario.
  return { ok: true, scenarios: result.data.scenarios as Scenario[] };
}
