import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { boundsOf, Camera, cameraForBounds, legControls, lerpCamera, makeProjection } from "../../lib/geo";
import { Options, visitedInRouteOrder } from "../../lib/timeline";
import { FilmTheme } from "../../theme";
import { FilmData, LatLng, Location } from "../../types";

type LatLngLike = LatLng;
import { MapBackground } from "./MapBackground";

/*
 * The map under the photos. One continuous camera for the whole location segment:
 *
 *   walk  (0 … W)      BIG map. Camera eases from the previous stop's framing to a view of the whole leg,
 *                      the dot walks the curved leg, and the camera is already zooming into this stop
 *                      while the dot slows down — no stop-then-jump.
 *   shot i             film still only → map BIG; while the two photos separate → map shrinks to SMALL
 *                      and the camera moves to that shot's camera position; next shot → grows back (G frames).
 *
 * The MapLibre canvas never changes size; BIG/SMALL is a clip-path on a fixed 1000×860 canvas.
 */

const MAP_W = 1000;
const MAP_H = 860;
const SMALL_TOP = 560; // clip offset: SMALL window is canvas rows 560–860
const Y_BIG = MAP_H / 2;
const Y_SMALL = SMALL_TOP + (MAP_H - SMALL_TOP) / 2;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const walkEase = Easing.bezier(0.42, 0, 0.3, 1);
const p = (frame: number, a: number, b: number, e = ease) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing: e });

/** Camera of the given zoom that puts `pt` at canvas row `y`. */
const camAt = (pt: LatLngLike, zoom: number, y: number): Camera => ({ lat: pt.lat + (y - Y_BIG) / zoom, lng: pt.lng, zoom });

const locationBounds = (location: Location) =>
  boundsOf([location, ...location.shots.flatMap((shot) => (shot.camera ? [shot.camera] : []))]);

const bigCam = (location: Location) => cameraForBounds(locationBounds(location), MAP_W, MAP_H, 110);
const smallCam = (location: Location, shotIndex: number) => {
  const zoom = cameraForBounds(locationBounds(location), MAP_W, MAP_H - SMALL_TOP, 50).zoom;
  return camAt(location.shots[shotIndex]?.camera ?? location, zoom, Y_SMALL);
};

const haversine = (a: LatLngLike, b: LatLngLike) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
export const walkMinutes = (a: LatLngLike, b: LatLngLike) => Math.max(1, Math.ceil((haversine(a, b) * 1.3) / 75));

/** Stops in the order the video visits them. */
export const stopsInVideoOrder = (film: FilmData, options: Options): Location[] =>
  film.structure === "route"
    ? visitedInRouteOrder(film, options)
    : film.locations.filter((l) => l.visited && (options.days === null || (l.day !== null && options.days.includes(l.day)))).sort((a, b) => (a.filmOrder ?? 99) - (b.filmOrder ?? 99));

// --- Catmull-Rom route in screen space -------------------------------------------------------
type Pt = [number, number];
const bez = ([a, b, c, d]: [Pt, Pt, Pt, Pt], u: number): Pt => {
  const v = 1 - u;
  return [
    v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0],
    v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1],
  ];
};
const legD = (c: [Pt, Pt, Pt, Pt]) => `M ${c[0][0]} ${c[0][1]} C ${c[1][0]} ${c[1][1]} ${c[2][0]} ${c[2][1]} ${c[3][0]} ${c[3][1]}`;
/** Sample a leg by arc length; returns the polyline up to fraction `t` and its end point. */
const partialLeg = (c: [Pt, Pt, Pt, Pt], t: number) => {
  const N = 64;
  const pts: Pt[] = [];
  const lens: number[] = [0];
  for (let k = 0; k <= N; k++) {
    pts.push(bez(c, k / N));
    if (k > 0) lens.push(lens[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  }
  const target = lens[N] * t;
  const out: Pt[] = [pts[0]];
  for (let k = 1; k <= N; k++) {
    if (lens[k] < target) {
      out.push(pts[k]);
      continue;
    }
    const f = (target - lens[k - 1]) / Math.max(1e-6, lens[k] - lens[k - 1]);
    out.push([pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f]);
    break;
  }
  return { d: `M ${out.map(([x, y]) => `${x} ${y}`).join(" L ")}`, end: out[out.length - 1] };
};

// --- component -----------------------------------------------------------------------------
export const MiniMap: React.FC<{
  film: FilmData;
  location: Location;
  previousLocation: Location | null;
  /** Frames of the walk phase at the start of the segment. */
  walkFrames: number;
  /** Frame lengths of each shot (they start after the walk). */
  shotFrames: number[];
  theme: FilmTheme;
  top: number;
  options: Options;
}> = ({ film, location, previousLocation, walkFrames: W, shotFrames, theme, top, options }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = theme.timing;
  const G = Math.round(0.5 * fps);
  const splitStart = (t.filmRevealSec + t.wipeSec + t.overlayHoldSec) * fps;
  const splitEnd = splitStart + t.splitSec * fps;

  const stops = stopsInVideoOrder(film, options);
  // The walked route goes through every shot's camera position, in shot order (1 → 2 → 3 → 4),
  // so P has one anchor per shot (the stop itself when a shot has no camera).
  type Anchor = { pt: LatLngLike; stop: number; intra: boolean };
  const anchors: Anchor[] = [{ pt: film.start, stop: -1, intra: false }];
  stops.forEach((st, si) => {
    // a new trip day starts again from the hotel / hostel, not from yesterday's last stop
    if (si > 0 && st.day !== stops[si - 1].day) anchors.push({ pt: film.start, stop: -1, intra: false });
    st.shots.forEach((sh, k) => anchors.push({ pt: sh.camera ?? st, stop: si, intra: k > 0 }));
  });
  const si = stops.findIndex((st) => st.id === location.id);
  const entry = anchors.findIndex((a) => a.stop === si); // anchor of shot 1 here
  const from = anchors[entry - 1].pt;
  const entryPt = anchors[entry].pt;

  // Camera + clip state (s: 0 = BIG, 1 = SMALL); `leg` = anchor leg being walked, `walk` = how much of it
  const big = bigCam(location);
  let camera: Camera;
  let s: number;
  let leg = entry - 1;
  let walk = 1;
  let activeShot = -1;
  if (frame < W) {
    const legCam = cameraForBounds(boundsOf([from, entryPt, location]), MAP_W, MAP_H, 150);
    const startCam = previousLocation ? smallCam(previousLocation, previousLocation.shots.length - 1) : legCam;
    const a = p(frame, 0, W * 0.35);
    const b = p(frame, W * 0.6, W);
    camera = lerpCamera(lerpCamera(startCam, legCam, a), big, b);
    s = previousLocation ? 1 - a : 0;
    walk = p(frame, W * 0.12, W * 0.88, walkEase);
  } else {
    let i = 0;
    let start = W;
    while (i < shotFrames.length - 1 && frame >= start + shotFrames[i]) {
      start += shotFrames[i];
      i++;
    }
    activeShot = i;
    const sf = frame - start;
    if (i > 0 && sf < G) {
      // walk on from shot i's spot to shot i+1's spot while the map grows back
      const g = p(sf, 0, G);
      camera = lerpCamera(smallCam(location, i - 1), big, g);
      s = 1 - g;
      leg = entry + i - 1;
      walk = g;
    } else {
      const q = p(sf, splitStart, splitEnd);
      camera = lerpCamera(big, smallCam(location, i), q);
      s = q;
      leg = entry + i - 1;
      walk = 1;
    }
  }

  const project = makeProjection(camera, MAP_W, MAP_H);
  const pts: Pt[] = anchors.map((a) => project(a.pt.lat, a.pt.lng));
  const legs = pts.slice(0, -1).map((_, k) => legControls(pts, k, anchors[k + 1].intra ? 0.08 : undefined));
  const current = leg >= 0 && leg < legs.length ? partialLeg(legs[leg], walk) : null;
  const dot: Pt = current ? current.end : pts[entry];
  // the evening walk back to the hotel isn't part of the route: don't draw legs that end at a re-inserted start
  // leg into a stop reached after exploring elsewhere: dashed, it wasn't one straight walk
  const detourLeg = (k: number) => {
    const to = anchors[k + 1];
    return !!to && to.stop >= 0 && !to.intra && !!stops[to.stop].detour;
  };
  const backToStart = (k: number) => k + 1 < anchors.length && anchors[k + 1].stop === -1;
  const firstAnchorOfStop = stops.map((_, k) => anchors.findIndex((a) => a.stop === k));
  const { colors } = theme;

  const next = stops[si + 1]; // stop after this one
  const nextText = !next
    ? "终点"
    : next.day !== location.day
      ? `DAY ${next.day} · ${next.placeZh}`
      : next.detour
        ? `下一站 · ${next.placeZh}` // the detour note is on the next stop's walk card; too long for this line
        : `下一站 · ${next.placeZh} · ${next.walkNoteZh ?? `步行约 ${walkMinutes(location, next)} 分钟`}`;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 40,
          top,
          width: MAP_W,
          height: MAP_H,
          overflow: "hidden",
          clipPath: `inset(${SMALL_TOP * s}px 0px 0px 0px round 16px)`,
        }}
      >
        <MapBackground camera={camera} width={MAP_W} height={MAP_H} features={film.mapFeatures} theme={theme} />
        <svg width={MAP_W} height={MAP_H} style={{ position: "absolute", inset: 0 }}>
          {/* upcoming legs */}
          {legs.map((c, k) =>
            backToStart(k) ? null : k > leg ? <path key={`u${k}`} d={legD(c)} fill="none" stroke={colors.route} strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" opacity={0.55} /> : null,
          )}
          {/* walked legs */}
          {legs.map((c, k) =>
            backToStart(k) ? null : k < leg ? <path key={`d${k}`} d={legD(c)} fill="none" stroke={colors.route} strokeWidth={6} strokeLinecap="round" opacity={0.9} strokeDasharray={detourLeg(k) ? "10 14" : undefined} /> : null,
          )}
          {current ? <path d={current.d} fill="none" stroke={colors.route} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={detourLeg(leg) ? "10 14" : undefined} /> : null}
          {/* start (hollow) and the other stops */}
          <circle cx={pts[0][0]} cy={pts[0][1]} r={9} fill={colors.bg} stroke={colors.route} strokeWidth={3} />
          {firstAnchorOfStop.map((a, k) =>
            k === si || a < 0 ? null : <circle key={`s${k}`} cx={pts[a][0]} cy={pts[a][1]} r={7} fill={colors.muted} stroke={colors.bg} strokeWidth={3} />,
          )}
          {/* shot camera positions */}
          {location.shots.map((shot, k) => {
            if (!shot.camera) return null;
            const [x, y] = project(shot.camera.lat, shot.camera.lng);
            const active = k === activeShot;
            return (
              <g key={`c${k}`} opacity={frame < W ? p(frame, W * 0.75, W) : 1}>
                <circle cx={x} cy={y} r={active ? 11 : 8} fill={active ? colors.accent : colors.marker} stroke="white" strokeWidth={3} />
                <text x={x + 14} y={y - 10} fontFamily={theme.fonts.latin} fontSize={30} fontWeight={700} fill={colors.ink} stroke={colors.bg} strokeWidth={4} paintOrder="stroke">
                  {k + 1}
                </text>
              </g>
            );
          })}
          <circle cx={dot[0]} cy={dot[1]} r={13} fill={colors.accent} stroke="white" strokeWidth={4} />
        </svg>
      </div>
      {theme.miniMapRoute ? (
        <div style={{ position: "absolute", top: 1776, left: 40, width: MAP_W, height: 40, color: colors.muted, fontFamily: theme.fonts.zh, fontSize: 30, lineHeight: "40px" }}>
          {nextText}
        </div>
      ) : null}
    </>
  );
};
