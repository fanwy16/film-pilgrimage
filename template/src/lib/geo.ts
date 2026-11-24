import { LatLng } from "../types";

export type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

/** zoom = pixels per degree of latitude. */
export type Camera = { lat: number; lng: number; zoom: number };

export type Projection = (lat: number, lng: number) => [number, number];

/** Smallest visible span (~450 m) so a single point doesn't zoom in forever. */
const MIN_SPAN = 0.004;

export const boundsOf = (points: LatLng[]): Bounds => {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
};

export const cameraForBounds = (b: Bounds, width: number, height: number, padding: number): Camera => {
  const lat = (b.minLat + b.maxLat) / 2;
  const lng = (b.minLng + b.maxLng) / 2;
  const cos = Math.cos((lat * Math.PI) / 180);
  const spanLat = Math.max(b.maxLat - b.minLat, MIN_SPAN);
  const spanLng = Math.max((b.maxLng - b.minLng) * cos, MIN_SPAN);
  const zoom = Math.min((width - 2 * padding) / spanLng, (height - 2 * padding) / spanLat);
  return { lat, lng, zoom };
};

/** Linear pan, geometric zoom — feels like a real map fly-to. */
export const lerpCamera = (a: Camera, b: Camera, t: number): Camera => ({
  lat: a.lat + (b.lat - a.lat) * t,
  lng: a.lng + (b.lng - a.lng) * t,
  zoom: Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * t),
});

export const makeProjection = (cam: Camera, width: number, height: number): Projection => {
  const cos = Math.cos((cam.lat * Math.PI) / 180);
  return (lat, lng) => [width / 2 + (lng - cam.lng) * cos * cam.zoom, height / 2 - (lat - cam.lat) * cam.zoom];
};

/** Visible lat/lng extent of a camera. */
export const viewExtent = (cam: Camera, width: number, height: number): Bounds => {
  const cos = Math.cos((cam.lat * Math.PI) / 180);
  const halfLat = height / 2 / cam.zoom;
  const halfLng = width / 2 / (cam.zoom * cos);
  return {
    minLat: cam.lat - halfLat,
    maxLat: cam.lat + halfLat,
    minLng: cam.lng - halfLng,
    maxLng: cam.lng + halfLng,
  };
};

/**
 * Smooth SVG path through points (Catmull-Rom → cubic Bézier).
 * Two points get a gentle arc instead of a straight line.
 */
/** Sideways bend of every route leg, as a fraction of its length (alternating side per leg). */
const BEND = 0.16;

/**
 * Cubic Bézier controls for route leg i (pts[i] → pts[i+1]): Catmull-Rom tangents plus a gentle
 * sideways bend so even a leg without neighbours reads as a walked curve, not a ruler line.
 * Used by the overview map, the mini-map and the route card so they always match.
 */
export const legControls = (pts: [number, number][], i: number, bend = BEND): [[number, number], [number, number], [number, number], [number, number]] => {
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(pts.length - 1, i + 2)];
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const side = i % 2 === 0 ? 1 : -1;
  const nx = -dy * bend * side;
  const ny = dx * bend * side;
  // Tangent handles are capped relative to this leg's own length: a long neighbouring leg
  // would otherwise make a short leg overshoot into a loop.
  const len = Math.hypot(dx, dy);
  const cap = (vx: number, vy: number): [number, number] => {
    const m = Math.hypot(vx, vy);
    const max = 0.4 * len;
    return m > max && m > 0 ? [(vx / m) * max, (vy / m) * max] : [vx, vy];
  };
  const [ax, ay] = cap((p2[0] - p0[0]) / 6, (p2[1] - p0[1]) / 6);
  const [bx, by] = cap((p3[0] - p1[0]) / 6, (p3[1] - p1[1]) / 6);
  return [p1, [p1[0] + ax + nx, p1[1] + ay + ny], [p2[0] - bx + nx, p2[1] - by + ny], p2];
};

/** Smooth curve through points. `bend` = 0 for features like rivers that must not bulge. */
export const smoothPath = (pts: [number, number][], bend = BEND): string => {
  if (pts.length === 0) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [, c1, c2, p2] = legControls(pts, i, bend);
    d += ` C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
};

/** Route leg i as its own path. */
export const legPath = (points: [number, number][], i: number): string => {
  if (points.length < 2 || i < 0 || i >= points.length - 1) return "";
  const [p1, c1, c2, p2] = legControls(points, i);
  return `M ${p1[0]} ${p1[1]} C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
};
