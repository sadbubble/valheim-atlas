import { useEffect, useState } from 'react';
import { frameStats } from '../render/frame-stats';

/** Polls the renderer's frame stats twice a second (outside the render loop). */
export function StatsOverlay() {
  const [snap, setSnap] = useState({ ...frameStats });
  useEffect(() => {
    const id = window.setInterval(() => {
      setSnap({ ...frameStats });
    }, 500);
    return () => {
      window.clearInterval(id);
    };
  }, []);
  return (
    <div className="hud-panel hud-stats" aria-label="Renderer statistics">
      <span>{snap.fps.toFixed(0)} fps</span>
      <span>{snap.drawCalls} draws</span>
      <span>{(snap.triangles / 1000).toFixed(0)}k tris</span>
      <span>{snap.terrainChunks} chunks</span>
      <span>{snap.propInstances} props</span>
    </div>
  );
}
