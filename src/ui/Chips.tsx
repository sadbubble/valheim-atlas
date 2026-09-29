export function Chips({
  items,
  tone,
}: {
  items: readonly string[];
  tone: 'weak' | 'resist' | 'immune' | 'plain';
}) {
  if (items.length === 0) return <span className="muted">none</span>;
  return (
    <span className="chips">
      {items.map((i) => (
        <span key={i} className={`chip chip-${tone}`}>
          {i}
        </span>
      ))}
    </span>
  );
}
