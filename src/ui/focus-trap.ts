import { useEffect, type KeyboardEvent, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab / Shift+Tab cycling inside `container` (modal dialogs). */
export function trapTabKey(e: KeyboardEvent<HTMLElement>, container: HTMLElement | null): void {
  if (e.key !== 'Tab' || !container) return;
  const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE);
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (!first || !last) return;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Makes everything outside `modal` inert: walks up to <body> and marks each sibling on the
 * way. Returns a function that undoes exactly those changes.
 */
function makeOthersInert(modal: HTMLElement | null): () => void {
  const changed: HTMLElement[] = [];
  for (let node = modal; node && node !== document.body; node = node.parentElement) {
    for (const sib of node.parentElement?.children ?? []) {
      if (sib !== node && sib instanceof HTMLElement && !sib.inert) {
        sib.inert = true;
        changed.push(sib);
      }
    }
  }
  return () => {
    for (const el of changed) el.inert = false;
  };
}

/**
 * While `open`: everything outside the modal is made `inert` (unreachable by keyboard, pointer
 * and screen readers), focus starts on `initial`, and it is pulled back into `container`
 * whenever it escapes (e.g. a click on the backdrop).
 */
export function useModalFocus(
  open: boolean,
  container: RefObject<HTMLElement | null>,
  initial: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;
    const restoreBackground = makeOthersInert(container.current);
    initial.current?.focus();
    const onFocusIn = (e: FocusEvent) => {
      const d = container.current;
      if (d && e.target instanceof Node && !d.contains(e.target)) initial.current?.focus();
    };
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      restoreBackground();
    };
  }, [open, container, initial]);
}
