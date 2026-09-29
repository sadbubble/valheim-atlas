/** Shown wherever a data value is null: it exists in the game but we have no source yet. */
export function Unverified() {
  return (
    <span
      className="unverified"
      title="No verified source yet. This value is listed in docs/DATA_TODO.md."
    >
      unverified
    </span>
  );
}
