import React from "react";
import { makeProjection, smoothPath, viewExtent } from "../../lib/geo";
import type { MapBackgroundProps } from "./MapBackground";

/** Choose a grid step (in degrees) that lands roughly every `targetPx` pixels. */
const niceStep = (degPerPx: number, targetPx: number) => {
  const raw = degPerPx * targetPx;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / pow;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pow;
};

/** Simplified, tile-free map: paper background, lat/lng grid, rivers. */
export const SvgMap: React.FC<MapBackgroundProps> = ({ camera, width, height, features, theme }) => {
  const project = makeProjection(camera, width, height);
  const ext = viewExtent(camera, width, height);
  const { colors } = theme;

  const latStep = niceStep(1 / camera.zoom, 180);
  const lngStep = latStep / Math.cos((camera.lat * Math.PI) / 180);
  const latLines: number[] = [];
  const lngLines: number[] = [];
  for (let v = Math.ceil(ext.minLat / latStep) * latStep; v <= ext.maxLat; v += latStep) latLines.push(v);
  for (let v = Math.ceil(ext.minLng / lngStep) * lngStep; v <= ext.maxLng; v += lngStep) lngLines.push(v);

  return (
    <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }}>
      <rect width={width} height={height} fill={colors.mapLand} />
      {latLines.map((lat) => {
        const [, y] = project(lat, camera.lng);
        return <line key={`lat${lat}`} x1={0} x2={width} y1={y} y2={y} stroke={colors.mapGrid} strokeWidth={2} />;
      })}
      {lngLines.map((lng) => {
        const [x] = project(camera.lat, lng);
        return <line key={`lng${lng}`} y1={0} y2={height} x1={x} x2={x} stroke={colors.mapGrid} strokeWidth={2} />;
      })}
      {features.map((f) => (
        <path
          key={f.name}
          d={smoothPath(f.points.map(([lat, lng]) => project(lat, lng)), 0)}
          fill="none"
          stroke={colors.mapWater}
          strokeWidth={Math.max(6, Math.min(40, camera.zoom * 0.0009))}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
};
