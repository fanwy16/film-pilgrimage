import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCurrentFrame, useDelayRender } from "remotion";
import { Camera } from "../../lib/geo";
import { MapBackgroundProps } from "./MapBackground";

const toMapLibreZoom = (camera: Camera) =>
  Math.log2(camera.zoom * Math.cos((camera.lat * Math.PI) / 180) * 360 / 512);

export const MaplibreMap: React.FC<MapBackgroundProps> = ({ camera, width, height, theme }: MapBackgroundProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const frame = useCurrentFrame();
  const { delayRender, continueRender } = useDelayRender();
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [loadingHandle] = useState(() => delayRender("Loading MapLibre map"));
  const [frameReady, setFrameReady] = useState(false);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  useEffect(() => {
    if (!containerRef.current) return;

    maplibregl.setWorkerUrl(
      URL.createObjectURL(
        new Blob([`import "https://unpkg.com/maplibre-gl@${maplibregl.getVersion()}/dist/maplibre-gl-worker.mjs";`], {
          type: "text/javascript",
        }),
      ),
    );

    const initialMap = new maplibregl.Map({
      container: containerRef.current,
      style: theme.mapStyle,
      center: [cameraRef.current.lng, cameraRef.current.lat],
      zoom: toMapLibreZoom(cameraRef.current),
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      pixelRatio: 2,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapRef.current = initialMap;

    initialMap.once("load", () => {
      initialMap.jumpTo({ center: [cameraRef.current.lng, cameraRef.current.lat], zoom: toMapLibreZoom(cameraRef.current) });
      initialMap.once("idle", () => {
        setMap(initialMap);
        setFrameReady(true);
        continueRender(loadingHandle);
      });
    });
  }, [continueRender, height, loadingHandle, theme.mapStyle, width]);

  useEffect(() => {
    if (!map || !frameReady) return;
    const handle = delayRender(`Rendering MapLibre frame ${frame}`);
    map.jumpTo({ center: [camera.lng, camera.lat], zoom: toMapLibreZoom(camera) });
    map.once("idle", () => continueRender(handle));
    map.triggerRepaint();
  }, [camera, continueRender, delayRender, frame, frameReady, map]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ position: "absolute", left: 0, top: 0, width, height, filter: theme.mapFilter, overflow: "hidden" }}
      />
      <div
        style={{
          position: "absolute",
          right: 24,
          bottom: 20,
          zIndex: 2,
          color: theme.colors.muted,
          fontFamily: theme.fonts.latin,
          fontSize: 18,
          lineHeight: 1,
          textShadow: `0 1px 2px ${theme.colors.bg}`,
          pointerEvents: "none",
        }}
      >
        © OpenFreeMap © OpenMapTiles © OpenStreetMap
      </div>
    </>
  );
};
