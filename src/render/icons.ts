/**
 * Our own icon set (original 24×24 SVG paths, CLAUDE.md rule 1). Used both as inline SVG in
 * the UI and rasterized into the marker atlas for the 3D view.
 */
export const ICONS = {
  boss: {
    d: 'M3 4C4 8 6 10 8 10.5C8.5 8 10 6.5 12 6.5C14 6.5 15.5 8 16 10.5C18 10 20 8 21 4C21.5 9 20 12.5 17 13.5V17C17 19.5 15 21 12 21C9 21 7 19.5 7 17V13.5C4 12.5 2.5 9 3 4ZM9.5 14.5A1.3 1.3 0 1 0 9.5 17.1A1.3 1.3 0 1 0 9.5 14.5ZM14.5 14.5A1.3 1.3 0 1 0 14.5 17.1A1.3 1.3 0 1 0 14.5 14.5Z',
    evenOdd: true,
  },
  miniboss: { d: 'M4 3H6L20 17L21 21L17 20L3 6ZM20 3H18L4 17L3 21L7 20L21 6Z', evenOdd: false },
  start: { d: 'M4 21V9L6 7L8 9V21ZM10 21V5L12 3L14 5V21ZM16 21V9L18 7L20 9V21Z', evenOdd: false },
  dungeon: { d: 'M4 21V11A8 8 0 0 1 20 11V21H15V13A3 3 0 0 0 9 13V21Z', evenOdd: false },
  trader: {
    d: 'M9 3H15L13.5 6C18 7.5 20 11 20 15C20 19 17 21 12 21C7 21 4 19 4 15C4 11 6 7.5 10.5 6ZM11 10V12H10V14H11V16H13V14H14V12H13V10Z',
    evenOdd: true,
  },
  vegvisir: { d: 'M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z', evenOdd: false },
  village: { d: 'M12 3L21 11H18V20H6V11H3ZM10 20V14H14V20Z', evenOdd: true },
  runestone: {
    d: 'M7 21V7C7 4 9 2.5 12 2.5C15 2.5 17 4 17 7V21ZM11 7H13V17H11ZM13 9L15.5 11.5L14.5 12.5L13 11Z',
    evenOdd: true,
  },
  landmark: { d: 'M2 20L9 7L13 13L16 9L22 20Z', evenOdd: false },
  creature: {
    d: 'M12 11.5C15 11.5 17.5 14.5 17.5 17C17.5 19.5 15.5 20 12 19C8.5 20 6.5 19.5 6.5 17C6.5 14.5 9 11.5 12 11.5ZM4 9A2 2.6 0 1 0 8 9A2 2.6 0 1 0 4 9ZM16 9A2 2.6 0 1 0 20 9A2 2.6 0 1 0 16 9ZM8 5A2 2.6 0 1 0 12 5A2 2.6 0 1 0 8 5ZM12 5A2 2.6 0 1 0 16 5A2 2.6 0 1 0 12 5Z',
    evenOdd: false,
  },
  resource: { d: 'M7 3H17L22 9L12 21L2 9ZM7 9H17L12 17Z', evenOdd: true },
  pin: {
    d: 'M12 2C7.6 2 4 5.6 4 10C4 15.5 12 22 12 22C12 22 20 15.5 20 10C20 5.6 16.4 2 12 2ZM12 7A3 3 0 1 0 12 13A3 3 0 1 0 12 7Z',
    evenOdd: true,
  },
  unknown: {
    d: 'M9 9C9 6 10.5 4.5 12 4.5C14 4.5 15.5 6 15.5 8C15.5 10.5 12.8 11 12.8 13.5V14.5H11.2V13.5C11.2 10 14 9.8 14 8C14 6.8 13.2 6 12 6C10.8 6 10.4 7 10.4 9ZM11 16.5H13V18.5H11Z',
    evenOdd: false,
  },
  search: {
    d: 'M10 3A7 7 0 1 0 14.2 15.6L19.3 20.7L20.7 19.3L15.6 14.2A7 7 0 0 0 10 3ZM10 5A5 5 0 1 1 10 15A5 5 0 1 1 10 5Z',
    evenOdd: true,
  },
  ruler: {
    d: 'M3 16L16 3L21 8L8 21ZM7 15L8 16L9.5 14.5L8.5 13.5ZM10 12L11 13L12.5 11.5L11.5 10.5ZM13 9L14 10L15.5 8.5L14.5 7.5Z',
    evenOdd: true,
  },
  link: {
    d: 'M10 14L14 10M8.5 12.5L6 15A3 3 0 0 0 9 18L11.5 15.5L13 17L10 20A5 5 0 0 1 4 14L7 11ZM15.5 11.5L18 9A3 3 0 0 0 15 6L12.5 8.5L11 7L14 4A5 5 0 0 1 20 10L17 13ZM9 14.5L14.5 9L15 9.5L9.5 15Z',
    evenOdd: false,
  },
  close: {
    d: 'M5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19L5 17.6L10.6 12Z',
    evenOdd: false,
  },
  layers: {
    d: 'M12 3L22 8.5L12 14L2 8.5ZM4.5 12L12 16.2L19.5 12L22 13.4L12 19L2 13.4Z',
    evenOdd: false,
  },
  fly: { d: 'M2 12L21 3L14 21L11.5 13.5ZM11.5 13.5L21 3Z', evenOdd: false },
} as const;

export type IconId = keyof typeof ICONS;
export const ICON_IDS = Object.keys(ICONS) as IconId[];
/** Icons rendered into the 3D marker atlas, in atlas order. */
export const MARKER_ICONS: readonly IconId[] = [
  'boss',
  'miniboss',
  'start',
  'dungeon',
  'trader',
  'vegvisir',
  'village',
  'runestone',
  'landmark',
  'creature',
  'resource',
  'pin',
  'unknown',
];
