import { useEffect, useRef, useState } from 'react';
import type { GeoFeature } from '../../lib/ton618Iom';
import type { BoundaryFeature } from '../../services/boundaries';

// Retain all ADM3 features. The normal outlines are rasterized only when the
// camera settles, instead of repainting 1,627 paths at every pointer event.
const BASE_ZOOM = 8;
const TILE_SIZE = 256;
const OVERSCAN = 192;
const REPAINT_DISTANCE = 144;
const GRID_CELL = 0.05; // degrees. Hit-testing still uses exact polygon geometry.

function mercator([longitude, latitude]: [number, number]) {
  const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin(lat * Math.PI / 180);
  const world = TILE_SIZE * 2 ** BASE_ZOOM;
  return {
    x: (longitude + 180) / 360 * world,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world,
  };
}

export type CanvasCadastre = {
  feature: GeoFeature;
  index: number;
  name: string;
  code: string;
  bounds: [number, number, number, number] | null;
  path: Path2D;
  worldBounds: { left: number; top: number; right: number; bottom: number } | null;
  studyId: string | null;
  hostedIdps: number | null;
  returnees: number | null;
  modeledPopulation: number | null;
  destroyedBuildings: number | null;
  affectedBuildings: number | null;
  partiallyDamagedBuildings: number | null;
};

/** Project the polygon once when GeoJSON loads; no geometry projection on pan. */
export function cacheCadastrePath(geometry: BoundaryFeature) {
  const path = new Path2D();
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const polygon of geometry.polygons) {
    for (const ring of polygon) {
      let first = true;
      for (const point of ring) {
        const xy = mercator(point);
        if (!Number.isFinite(xy.x) || !Number.isFinite(xy.y)) continue;
        left = Math.min(left, xy.x); top = Math.min(top, xy.y);
        right = Math.max(right, xy.x); bottom = Math.max(bottom, xy.y);
        if (first) { path.moveTo(xy.x, xy.y); first = false; }
        else path.lineTo(xy.x, xy.y);
      }
      if (!first) path.closePath();
    }
  }
  return { path, worldBounds: Number.isFinite(left) ? { left, top, right, bottom } : null };
}

function bucketKey(lon: number, lat: number) {
  return `${Math.floor(lon / GRID_CELL)},${Math.floor(lat / GRID_CELL)}`;
}

/** Bounds-only candidate index; no villages are discarded or merged by code. */
export function buildCadastreHitIndex(entries: readonly CanvasCadastre[]): Map<string, CanvasCadastre[]> {
  const buckets = new Map<string, CanvasCadastre[]>();
  for (const item of entries) {
    const b = item.bounds;
    if (!b) continue;
    const fromX = Math.floor(b[0] / GRID_CELL), toX = Math.floor(b[2] / GRID_CELL);
    const fromY = Math.floor(b[1] / GRID_CELL), toY = Math.floor(b[3] / GRID_CELL);
    for (let x = fromX; x <= toX; x++) {
      for (let y = fromY; y <= toY; y++) {
        const key = `${x},${y}`;
        const bucket = buckets.get(key);
        if (bucket) bucket.push(item);
        else buckets.set(key, [item]);
      }
    }
  }
  return buckets;
}

export function cadastreAtPoint(
  entries: readonly CanvasCadastre[],
  point: [number, number],
  contains: (feature: GeoFeature, coords: [number, number]) => boolean,
  hitIndex?: ReadonlyMap<string, readonly CanvasCadastre[]>,
): CanvasCadastre | null {
  const candidates = hitIndex ? (hitIndex.get(bucketKey(point[0], point[1])) ?? []) : entries;
  // The buckets preserve input order, so the last overlapping shape wins.
  for (let i = candidates.length - 1; i >= 0; i--) {
    const entry = candidates[i], box = entry.bounds;
    if (!box || point[0] < box[0] || point[0] > box[2] || point[1] < box[1] || point[1] > box[3]) continue;
    if (contains(entry.feature, point)) return entry;
  }
  return null;
}

type Props = {
  entries: readonly CanvasCadastre[];
  selectedFeature: GeoFeature | null;
  hoveredId: string | null;
  zoom: number;
  centerPx: { x: number; y: number };
  width: number;
  height: number;
  dragging: boolean;
  verifiedPopulation: boolean;
  verifiedDamage: boolean;
  villageMetric: 'worldpop' | 'hosted' | 'returnees';
  villageDamageMetric: 'destroyed' | 'partial' | 'affected';
  populationMax: number; damageMax: number;
  damageColor: (count: number, max: number) => string;
  populationColor: (value: number, max: number) => string;
};

type Painted = {
  x: number; y: number; zoom: number; width: number; height: number;
  entries: readonly CanvasCadastre[];
  verifiedPopulation: boolean; verifiedDamage: boolean;
  villageMetric: Props['villageMetric']; villageDamageMetric: Props['villageDamageMetric'];
};

function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;
  // Cap DPR to avoid excessive raster work on high-DPI laptops.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = Math.max(1, Math.round((width + 2 * OVERSCAN) * dpr));
  const h = Math.max(1, Math.round((height + 2 * OVERSCAN) * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

function positionContext(ctx: CanvasRenderingContext2D, p: Painted) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const scale = 2 ** (p.zoom - BASE_ZOOM);
  const offsetX = p.width / 2 + OVERSCAN - p.x;
  const offsetY = p.height / 2 + OVERSCAN - p.y;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
  return { scale, offsetX, offsetY };
}

function isVisible(item: CanvasCadastre, p: Painted) {
  const b = item.worldBounds;
  if (!b) return false;
  const scale = 2 ** (p.zoom - BASE_ZOOM);
  const offsetX = p.width / 2 - p.x;
  const offsetY = p.height / 2 - p.y;
  return !(b.right * scale + offsetX < -OVERSCAN - 16 ||
    b.left * scale + offsetX > p.width + OVERSCAN + 16 ||
    b.bottom * scale + offsetY < -OVERSCAN - 16 ||
    b.top * scale + offsetY > p.height + OVERSCAN + 16);
}

export default function CadastreCanvas(props: Props) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastProps = useRef(props);
  lastProps.current = props;
  const paintedRef = useRef<Painted | null>(null);
  const [painted, setPainted] = useState<Painted | null>(null);

  // Cleanup must clear the RAF ID, including React Strict Mode effect replay.
  useEffect(() => () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  // Background outlines are expensive. During a drag, reuse the existing
  // raster with a compositor translate and repaint only every ~144px.
  useEffect(() => {
    if (props.width < 1 || props.height < 1) return;
    const previous = paintedRef.current;
    const material = !previous || previous.entries !== props.entries || previous.zoom !== props.zoom ||
      previous.width !== props.width || previous.height !== props.height ||
      previous.verifiedPopulation !== props.verifiedPopulation ||
      previous.verifiedDamage !== props.verifiedDamage || previous.villageMetric !== props.villageMetric || previous.villageDamageMetric !== props.villageDamageMetric;
    if (!material && props.dragging && previous &&
        Math.abs(props.centerPx.x - previous.x) < REPAINT_DISTANCE &&
        Math.abs(props.centerPx.y - previous.y) < REPAINT_DISTANCE) return;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const current = lastProps.current;
      const canvas = baseRef.current;
      if (!canvas || current.width < 1 || current.height < 1) return;
      const ctx = setupCanvas(canvas, current.width, current.height);
      if (!ctx) return;
      const p: Painted = {
        x: current.centerPx.x, y: current.centerPx.y,
        zoom: current.zoom, width: current.width, height: current.height,
        entries: current.entries, verifiedPopulation: current.verifiedPopulation,
        verifiedDamage: current.verifiedDamage, villageMetric: current.villageMetric, villageDamageMetric: current.villageDamageMetric,
      };
      const { scale } = positionContext(ctx, p);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#5ae5ff';
      ctx.globalAlpha = 0.96;
      ctx.lineWidth = (p.zoom <= 8 ? 1.55 : p.zoom <= 10 ? 1.35 : 1.2) / scale;
      for (const item of p.entries) {
        if (!isVisible(item, p)) continue;
        const value = p.villageMetric === 'worldpop' ? item.modeledPopulation : p.villageMetric === 'hosted' ? item.hostedIdps : item.returnees;
        const damage = p.villageDamageMetric === 'destroyed' ? item.destroyedBuildings : p.villageDamageMetric === 'partial' ? item.partiallyDamagedBuildings : item.affectedBuildings;
        const showDamage = p.verifiedDamage && damage !== null;
        if (showDamage || (p.verifiedPopulation && value !== null)) {
          ctx.fillStyle = showDamage ? current.damageColor(damage!, current.damageMax) : current.populationColor(value!, current.populationMax);
          ctx.globalAlpha = showDamage ? 0.63 : 0.46;
          ctx.fill(item.path, 'evenodd');
          ctx.globalAlpha = 0.96;
        }
        ctx.stroke(item.path);
      }
      ctx.globalAlpha = 1;
      paintedRef.current = p;
      setPainted(p);
    });
  }, [props.entries, props.centerPx, props.zoom, props.width, props.height, props.dragging,
    props.verifiedPopulation, props.verifiedDamage, props.villageMetric, props.villageDamageMetric,
    props.populationMax, props.damageMax, props.damageColor, props.populationColor]);

  // Hover and selection have their own inexpensive canvas. Do not repaint
  // 1,627 background polygons whenever the mouse crosses a village border.
  useEffect(() => {
    const p = paintedRef.current;
    const canvas = activeRef.current;
    if (!canvas || !p) return;
    const ctx = setupCanvas(canvas, p.width, p.height);
    if (!ctx) return;
    const { scale } = positionContext(ctx, p);
    const { entries, hoveredId, selectedFeature } = lastProps.current;
    const selected = selectedFeature ? entries.find(item => item.feature === selectedFeature) : null;
    const hovered = hoveredId ? entries.find(item => `cadastre-${item.index}` === hoveredId) : null;
    for (const [item, active] of [[hovered, false], [selected, true]] as const) {
      if (!item || !isVisible(item, p)) continue;
      ctx.fillStyle = active ? '#ff4356' : '#8ae5f5';
      ctx.globalAlpha = active ? 0.43 : 0.15;
      ctx.fill(item.path, 'evenodd');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = active ? '#ff4356' : '#b9f7ff';
      ctx.lineWidth = (active ? 3.6 : 2.6) / scale;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = active ? '#ff4356' : '#49d7f9';
      ctx.shadowBlur = active ? 10 : 7;
      ctx.stroke(item.path);
      ctx.shadowBlur = 0;
    }
  }, [painted, props.entries, props.selectedFeature, props.hoveredId]);

  // Move the last painted raster with the map between expensive refreshes.
  // This is a compositor-only transform (no SVG redraw or border loss).
  const dx = painted && painted.zoom === props.zoom ? painted.x - props.centerPx.x : 0;
  const dy = painted && painted.zoom === props.zoom ? painted.y - props.centerPx.y : 0;
  const canvasStyle = {
    position: 'absolute' as const,
    left: -OVERSCAN, top: -OVERSCAN,
    width: `${props.width + 2 * OVERSCAN}px`,
    height: `${props.height + 2 * OVERSCAN}px`,
    pointerEvents: 'none' as const,
  };
  return <div aria-hidden="true" style={{
    position: 'absolute', inset: 0, zIndex: 2, overflow: 'hidden', pointerEvents: 'none',
  }}>
    <div style={{
      position: 'absolute', inset: 0, willChange: 'transform',
      transform: `translate3d(${dx}px, ${dy}px, 0)`, pointerEvents: 'none',
    }}>
      <canvas ref={baseRef} style={canvasStyle}/>
      <canvas ref={activeRef} style={canvasStyle}/>
    </div>
  </div>;
}
