import { create } from 'zustand';
import type { BiomeId } from '../data/schema';
import { EMPTY_HIGHLIGHT, type Highlight } from '../render/navigation';

export type InfoTab = 'overview' | 'threats' | 'loot' | 'tips';
export type Tool = 'none' | 'pin' | 'measure';

export interface Selection {
  /** Content id (biome, location type, creature…) or a pin id. */
  id: string;
  /** Placed location instance, when opened from a map marker. */
  instance?: { id: string; x: number; z: number };
}

export interface HoverInfo {
  /** Marker key under the pointer. */
  key: string;
  title: string;
  subtitle: string;
  screenX: number;
  screenY: number;
}

/** Which view the left drawer shows: map setup (layers, tools) or the progression guide. */
export type Drawer = 'map' | 'guide';

interface UiState {
  drawer: Drawer;
  setDrawer: (drawer: Drawer) => void;
  selection: Selection | null;
  tab: InfoTab;
  hover: HoverInfo | null;
  /** Game coordinates under the cursor, or null when off the world. */
  cursor: { x: number; z: number; heightM: number; biomeId: BiomeId | null } | null;
  tool: Tool;
  measure: { x: number; z: number }[];
  highlight: Highlight;
  /** Entries the user chose to reveal despite the spoiler setting. */
  revealed: string[];
  select: (selection: Selection | null, tab?: InfoTab) => void;
  setTab: (tab: InfoTab) => void;
  setHover: (hover: HoverInfo | null) => void;
  setCursor: (cursor: UiState['cursor']) => void;
  setTool: (tool: Tool) => void;
  addMeasurePoint: (p: { x: number; z: number }) => void;
  clearMeasure: () => void;
  setHighlight: (h: Highlight) => void;
  reveal: (...ids: string[]) => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  drawer: 'map',
  setDrawer: (drawer) => {
    set({ drawer });
  },
  selection: null,
  tab: 'overview',
  hover: null,
  cursor: null,
  tool: 'none',
  measure: [],
  highlight: EMPTY_HIGHLIGHT,
  revealed: [],
  select: (selection, tab = 'overview') => {
    set({ selection, tab, ...(selection === null ? { highlight: EMPTY_HIGHLIGHT } : {}) });
  },
  setTab: (tab) => {
    set({ tab });
  },
  setHover: (hover) => {
    set({ hover });
  },
  setCursor: (cursor) => {
    set({ cursor });
  },
  setTool: (tool) => {
    set({ tool, ...(tool !== 'measure' ? { measure: [] } : {}) });
  },
  addMeasurePoint: (p) => {
    const m = get().measure;
    set({ measure: m.length >= 2 ? [p] : [...m, p] });
  },
  clearMeasure: () => {
    set({ measure: [] });
  },
  setHighlight: (highlight) => {
    set({ highlight });
  },
  reveal: (...ids) => {
    const add = ids.filter((id) => !get().revealed.includes(id));
    if (add.length > 0) set({ revealed: [...get().revealed, ...add] });
  },
}));
