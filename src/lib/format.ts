/** "850 m" or "1.23 km". */
export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;
}

/** Game-style coordinates: X east, Z north, whole metres. */
export function formatCoords(x: number, z: number): string {
  return `X ${Math.round(x)} · Z ${Math.round(z)}`;
}

export function humanizeKey(key: string): string {
  const s = key
    .replace(/([a-z])M$/, '$1 (m)')
    .replace(/([a-z])S$/, '$1 (s)')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
