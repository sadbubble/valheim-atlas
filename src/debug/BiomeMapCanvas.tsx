import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { GeneratedWorld, PlacedLocation } from '../world/types';
import { renderBiomeMap, type BiomeMapStyle } from './render-biome-map';

export interface MapMarker {
  location: PlacedLocation;
  color: string;
  radiusPx: number;
}

export interface HoverInfo {
  x: number;
  z: number;
  cell: number;
}

interface Props {
  world: GeneratedWorld;
  style: BiomeMapStyle;
  markers: readonly MapMarker[];
  sizePx: number;
  onHover: (info: HoverInfo | null) => void;
}

/** Draws the biome map (1 pixel per cell) scaled to `sizePx`, with location markers on top. */
export function BiomeMapCanvas({ world, style, markers, sizePx, onHover }: Props) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [dpr] = useState(() => Math.min(2, window.devicePixelRatio || 1));

  useEffect(() => {
    const canvas = baseRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const n = world.resolution;
    canvas.width = n;
    canvas.height = n;
    const pixels = renderBiomeMap(world, style);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), n, n), 0, 0);
  }, [world, style]);

  useEffect(() => {
    const canvas = overlayRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const px = Math.round(sizePx * dpr);
    canvas.width = px;
    canvas.height = px;
    ctx.clearRect(0, 0, px, px);
    const scale = px / (2 * world.extentM);
    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    for (const m of markers) {
      const cx = (m.location.x + world.extentM) * scale;
      const cy = (world.extentM - m.location.z) * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, m.radiusPx * dpr, 0, Math.PI * 2);
      ctx.fillStyle = m.color;
      ctx.fill();
      ctx.stroke();
    }
  }, [world, markers, sizePx, dpr]);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;
    const x = -world.extentM + u * 2 * world.extentM;
    const z = world.extentM - v * 2 * world.extentM;
    const n = world.resolution;
    const i = Math.min(n - 1, Math.max(0, Math.floor(u * n)));
    const j = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    onHover({ x, z, cell: j * n + i });
  };

  return (
    <div
      className="map-stack"
      style={{ width: sizePx, height: sizePx }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        onHover(null);
      }}
    >
      <canvas ref={baseRef} className="map-base" aria-label="Biome map" />
      <canvas ref={overlayRef} className="map-overlay" aria-hidden="true" />
    </div>
  );
}
