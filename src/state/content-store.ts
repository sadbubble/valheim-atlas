import { create } from 'zustand';
import { buildContentIndex, type ContentIndex } from '../data/content-index';
import { loadContent } from '../data/load';

type ContentState =
  | { status: 'loading'; index: null }
  | { status: 'ready'; index: ContentIndex }
  | { status: 'error'; index: null; message: string };

export const useContentStore = create<ContentState>()(() => ({ status: 'loading', index: null }));

let started = false;
/** Loads and indexes public/data content once. */
export function ensureContentLoaded(): void {
  if (started) return;
  started = true;
  loadContent().then(
    (data) => {
      useContentStore.setState({ status: 'ready', index: buildContentIndex(data) });
    },
    (err: unknown) => {
      started = false;
      useContentStore.setState({ status: 'error', index: null, message: String(err) });
    },
  );
}
