import { spoilerLabel } from './use-spoiler';

export function SpoilerBadge({ level }: { level: number }) {
  return <span className={`spoiler-badge level-${level}`}>{spoilerLabel(level)}</span>;
}
