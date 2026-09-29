import { useRef, useState, type KeyboardEvent } from 'react';
import { appStore } from '../state/app-store';
import { applyOnboardingChoice, type OnboardingChoice } from '../state/onboarding';
import { prefsStore, shouldShowFirstRun } from '../state/prefs';
import { useUiStore } from '../state/ui-store';
import { trapTabKey, useModalFocus } from './focus-trap';

/**
 * First-run prompt (SPEC §7, N3/N8): "New to Valheim?". Shown once, on a visit with no
 * stored answer and no mode/spoiler in the URL. A modal dialog: focus is trapped inside,
 * Esc (or "Skip") dismisses it, and the answer is remembered in localStorage.
 */
export function FirstRunDialog() {
  // Decided from the URL as it was on arrival, before URL sync rewrites it.
  const [open, setOpen] = useState(() =>
    shouldShowFirstRun(window.location.search, prefsStore.getState().prefs),
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);

  // Focus starts on "Yes" and stays inside the dialog even if it escapes (backdrop click).
  useModalFocus(open, dialogRef, yesRef);

  if (!open) return null;

  const choose = (choice: OnboardingChoice) => {
    const { openGuide } = applyOnboardingChoice(choice, appStore, prefsStore);
    if (openGuide) useUiStore.getState().setDrawer('guide');
    setOpen(false);
    // Hand focus back to something sensible: the guide for newcomers, else the map.
    requestAnimationFrame(() => {
      const target = openGuide
        ? document.getElementById('guide-title')
        : document.querySelector<HTMLElement>('.world-canvas');
      target?.focus();
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The dialog owns the keyboard: global shortcuts must not fire behind it.
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      choose('dismissed');
      return;
    }
    trapTabKey(e, dialogRef.current);
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        // Clicking outside must not move focus behind the modal.
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      <div
        ref={dialogRef}
        className="hud-panel first-run"
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-title"
        aria-describedby="first-run-desc"
        onKeyDown={onKeyDown}
      >
        <h2 id="first-run-title">New to Valheim?</h2>
        <p id="first-run-desc">
          We can set the map up for you. Newcomers get a spoiler-free map and a step-by-step
          progression guide. Veterans see everything, with every map layer on. You can change this
          any time.
        </p>
        <div className="row first-run-actions">
          <button
            ref={yesRef}
            type="button"
            className="primary"
            onClick={() => {
              choose('newcomer');
            }}
          >
            Yes, I&apos;m new
          </button>
          <button
            type="button"
            onClick={() => {
              choose('veteran');
            }}
          >
            No, show me everything
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              choose('dismissed');
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
