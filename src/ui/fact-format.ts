import type { DamageType } from '../data/content-schema';

/** Formatting for FactTable values: null stays null (rendered "unverified"). */
export function num(v: number | null | undefined, unit = ''): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return `${Number.isInteger(v) ? v : v.toFixed(2)}${unit}`;
}

export function yesNo(v: boolean | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return v ? 'Yes' : 'No';
}

export function damageText(d: Partial<Record<DamageType, number>> | undefined): string | undefined {
  if (!d) return undefined;
  const parts = Object.entries(d)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${k}`);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

export function percent(v: number): string {
  return `${Math.round(v * 1000) / 10}%`;
}
