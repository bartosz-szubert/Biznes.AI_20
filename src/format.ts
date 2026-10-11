const plnFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });

const signedFormatter = new Intl.NumberFormat('pl-PL', {
  maximumFractionDigits: 1,
  signDisplay: 'always',
});

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const formatPLN = (value: number): string => plnFormatter.format(value);

/** Wartość już wyrażona w procentach, np. 153.5 → „153,5%”. */
export const formatPct = (value: number): string => `${numberFormatter.format(value)}%`;

export const formatSignedPct = (value: number): string => `${signedFormatter.format(value)} pp`;

export const formatSignedPLN = (value: number): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${plnFormatter.format(Math.abs(value))}`;

export const formatRoas = (value: number): string => `${numberFormatter.format(value)}×`;

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : dateFormatter.format(d);
};
