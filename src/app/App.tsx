import { useEffect } from 'react';
import { WorldCanvas } from '../render/WorldCanvas';
import { appStore } from '../state/app-store';
import { ensureContentLoaded } from '../state/content-store';
import { startUrlSync } from '../state/url-sync';
import { Hud } from '../ui/Hud';
import { useWorldGeneration } from './use-world-generation';

export function App() {
  useEffect(() => startUrlSync(appStore), []);
  useEffect(() => {
    ensureContentLoaded();
  }, []);
  useWorldGeneration();

  return (
    <main className="app">
      <WorldCanvas />
      <Hud />
    </main>
  );
}
