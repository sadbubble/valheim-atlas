import { ICONS, type IconId } from '../render/icons';

/** One of our own SVG icons; decorative unless a title is given. */
export function Icon({ id, size = 18, title }: { id: IconId; size?: number; title?: string }) {
  const icon = ICONS[id];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="icon"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      <path d={icon.d} fillRule={icon.evenOdd ? 'evenodd' : 'nonzero'} fill="currentColor" />
    </svg>
  );
}
