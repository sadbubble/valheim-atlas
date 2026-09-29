import type { ReactNode } from 'react';
import { humanizeKey } from '../lib/format';
import { Unverified } from './Unverified';

export interface FactRow {
  key: string;
  label: string;
  /** null renders as "unverified"; undefined rows are skipped. */
  value: ReactNode | null | undefined;
}

/**
 * Key facts for an entry. Every top-level null in `entry` is shown as "unverified" even if
 * no explicit row covers it, so unverified data is never silently dropped.
 */
export function FactTable({ rows, entry }: { rows: FactRow[]; entry: Record<string, unknown> }) {
  const shown = rows.filter((r) => r.value !== undefined);
  const keys = new Set(rows.map((r) => r.key));
  for (const [k, v] of Object.entries(entry)) {
    if (v === null && !keys.has(k)) shown.push({ key: k, label: humanizeKey(k), value: null });
  }
  if (shown.length === 0) return null;
  return (
    <dl className="facts">
      {shown.map((r) => (
        <div key={r.key} className="fact">
          <dt>{r.label}</dt>
          <dd>{r.value === null ? <Unverified /> : r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
