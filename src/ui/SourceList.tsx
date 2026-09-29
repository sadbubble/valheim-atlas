/** Collapsible "Sources" footer: every cited source, the game version and the confidence. */
export function SourceList({
  sources,
  gameVersion,
  confidence,
  notes,
}: {
  sources: readonly string[];
  gameVersion?: string | undefined;
  confidence?: string | undefined;
  notes?: string | undefined;
}) {
  return (
    <details className="sources">
      <summary>
        Sources ({sources.length}){gameVersion ? ` · game version ${gameVersion}` : ''}
        {confidence ? ` · ${confidence === 'read' ? 'read from source' : confidence}` : ''}
      </summary>
      <ul>
        {sources.map((s) => (
          <li key={s}>
            {s.startsWith('https://') ? (
              <a href={s} target="_blank" rel="noopener noreferrer">
                {s.replace(/^https:\/\/(www\.)?/, '').replace(/\/blob\/[0-9a-f]{40}\//, '/…/')}
              </a>
            ) : (
              <span>{s} (see docs/SOURCES.md)</span>
            )}
          </li>
        ))}
      </ul>
      {notes ? <p className="muted">{notes}</p> : null}
    </details>
  );
}
