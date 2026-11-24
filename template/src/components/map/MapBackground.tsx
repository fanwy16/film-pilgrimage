/**
 * Map base layer interface.
 *
 * Everything drawn on top (routes, markers) uses the same Camera + makeProjection()
 * from lib/geo.ts. To switch to real tiles later (e.g. MapLibre), write a component
 * with these props that renders tiles for `camera`, and export it here instead of SvgMap.
 */
import { Camera } from "../../lib/geo";
import { FilmTheme } from "../../theme";
import { MapFeature } from "../../types";
import { MaplibreMap } from "./MaplibreMap";

export type MapBackgroundProps = {
  camera: Camera;
  width: number;
  height: number;
  features: MapFeature[];
  theme: FilmTheme;
};

export const MapBackground: React.FC<MapBackgroundProps> = MaplibreMap;
