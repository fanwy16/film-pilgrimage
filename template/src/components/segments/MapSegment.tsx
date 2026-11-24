import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { cameraForBounds, legPath, lerpCamera, makeProjection } from "../../lib/geo";
import { Segment } from "../../lib/timeline";
import { FilmTheme } from "../../theme";
import { FilmData } from "../../types";
import { MapBackground } from "../map/MapBackground";
import { Marker, RouteLine } from "../map/Overlays";
import { RouteLegend } from "../map/RouteLegend";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const PADDING = 220;

/** Camera flies to the group, then the route draws from the previous point through the group's points. */
export const MapSegment: React.FC<{ seg: Extract<Segment, { kind: "map" }>; film: FilmData; theme: FilmTheme }> = ({
  seg,
  film,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const camEnd = theme.timing.mapCameraSec * fps;

  const camT = interpolate(frame, [0, camEnd], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const camera = lerpCamera(
    cameraForBounds(seg.cameraFrom, width, height, PADDING),
    cameraForBounds(seg.cameraTo, width, height, PADDING),
    camT,
  );
  const project = makeProjection(camera, width, height);

  const stops = [...(seg.from ? [seg.from] : []), ...seg.points];
  const pts = stops.map((p) => project(p.lat, p.lng));
  const offset = seg.from ? 1 : 0;
  // Overview labels: greedy placement. Each label tries spots around its marker (above, below, right,
  // left, then further out with a leader line) and takes the first one that stays on screen and doesn't
  // overlap any marker or label already placed.
  type Box = { x0: number; y0: number; x1: number; y1: number };
  const FS = 38;
  const textW = (t: string) => [...t].reduce((w, c) => w + (c.charCodeAt(0) < 128 ? FS * 0.52 : FS), 0);
  const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const markerBoxes: Box[] = pts.map(([x, y]) => ({ x0: x - 46, y0: y - 46, x1: x + 46, y1: y + 46 }));
  const placed: Box[] = [];
  const overviewLabels = seg.overview
    ? seg.points
        .map((place, index) => ({ place, index, x: pts[index + offset][0], y: pts[index + offset][1] }))
        .sort((p1, p2) => p1.y - p2.y)
        .map(({ place, index, x, y }) => {
          const w = textW(place.placeZh);
          // [anchor, text x, baseline y, needs leader line]
          const cands: ["start" | "middle" | "end", number, number, boolean][] = [
            ["middle", x, y - 56, false],
            ["middle", x, y + 82, false],
            ["start", x + 54, y + 13, false],
            ["end", x - 54, y + 13, false],
            ["middle", x, y - 118, true],
            ["middle", x, y + 144, true],
            ["start", x + 54, y - 52, true],
            ["end", x - 54, y - 52, true],
            ["start", x + 54, y + 78, true],
            ["end", x - 54, y + 78, true],
          ];
          const boxOf = ([anchor, tx, ty]: (typeof cands)[number]): Box => {
            const x0 = anchor === "start" ? tx : anchor === "end" ? tx - w : tx - w / 2;
            return { x0: x0 - 8, y0: ty - FS, x1: x0 + w + 8, y1: ty + 10 };
          };
          const fits = (c: (typeof cands)[number]) => {
            const bx = boxOf(c);
            // the label must read as belonging to its own marker: its nearest edge point is closer to this
            // marker than to any other one (otherwise "Kleines Café" can end up under ④ Albertina)
            const near = (mx: number, my: number) => Math.hypot(Math.max(bx.x0 - mx, 0, mx - bx.x1), Math.max(bx.y0 - my, 0, my - bx.y1));
            const own = near(x, y);
            if (pts.some(([mx, my]) => (mx !== x || my !== y) && near(mx, my) < own + 6)) return false;
            if (bx.x0 < 40 || bx.x1 > width - 40 || bx.y0 < 220 || bx.y1 > height - 140) return false;
            return !markerBoxes.some((m) => hit(bx, m)) && !placed.some((q) => hit(bx, q));
          };
          const choice = cands.find(fits) ?? cands[0];
          placed.push(boxOf(choice));
          return { place, index, x, y, anchor: choice[0], tx: choice[1], ty: choice[2], leader: choice[3] };
        })
    : [];
  const draw = interpolate(frame, [camEnd * 0.7, durationInFrames - 0.9 * fps /* route finished → hold ~0.6s, then the segment dips out */], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });

  const dayKeys = [...new Set(seg.points.map((p) => p.day))];
  const multiDay = !!seg.from && dayKeys.length > 1;
  const dayColor = (k: number) => (multiDay ? theme.colors.dayColors[k % theme.colors.dayColors.length] : theme.colors.route);
  // one line per trip day, each starting from the hotel / hostel; stops kept so detour legs can be dashed
  const dayLines = (multiDay ? dayKeys : [null]).map((d) => {
    const stops = seg.points.filter((p) => !multiDay || p.day === d);
    return { stops, pts: [...(seg.from ? [pts[0]] : []), ...stops.map((p) => pts[seg.points.indexOf(p) + offset])] };
  });
  const anyDetour = seg.points.some((p) => p.detour);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.mapLand }}>
      <MapBackground camera={camera} width={width} height={height} features={film.mapFeatures} theme={theme} />
      <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }}>
        {/* one line per trip day, drawn leg by leg; a leg into a "detour" stop is dashed */}
        {dayLines.map((line, k) => {
          const dayP = interpolate(draw, [k / dayLines.length, (k + 1) / dayLines.length], [0, 1], clamp);
          const n = line.pts.length - 1;
          return line.pts.slice(1).map((_, j) => {
            const p = Math.min(1, Math.max(0, dayP * n - j));
            const stop = line.stops[seg.from ? j : j + 1];
            const d = legPath(line.pts, j);
            return stop?.detour ? (
              <path key={`${k}-${j}`} d={d} fill="none" stroke={dayColor(k)} strokeWidth={7} strokeDasharray="4 16" strokeLinecap="round" opacity={p} />
            ) : (
              <RouteLine key={`${k}-${j}`} d={d} progress={p} color={dayColor(k)} />
            );
          });
        })}
        {seg.from ? (
          <>
            <Marker x={pts[0][0]} y={pts[0][1]} pop={1} theme={theme} hollow />
            {seg.overview ? (
              <text
                x={pts[0][0] < width * 0.72 ? pts[0][0] + 34 : pts[0][0] - 34}
                y={pts[0][1] + 14}
                textAnchor={pts[0][0] < width * 0.72 ? "start" : "end"}
                fontFamily={theme.fonts.zh}
                fontSize={40}
                fill={theme.colors.ink}
                stroke={theme.colors.labelBg}
                strokeWidth={8}
                paintOrder="stroke"
              >
                {seg.from.label}
              </text>
            ) : null}
          </>
        ) : null}
        {seg.points.map((p, i) => {
          const at = (i + offset) / Math.max(1, pts.length - 1);
          const [x, y] = pts[i + offset];
          return (
            <Marker
              key={p.id}
              x={x}
              y={y}
              pop={interpolate(draw, [at - 0.08, at + 0.04], [0, 1], clamp)}
              theme={theme}
              number={seg.overview ? i + 1 : undefined}
              label={seg.overview ? undefined : p.placeZh}
              labelSide={x > width * 0.6 ? "left" : "right"}
            />
          );
        })}
        {overviewLabels.map(({ place, x, y, anchor, tx, ty, leader }) => (
          <g key={`label-${place.id}`}>
            {leader
              ? (() => {
                  // from the marker's edge to the label, so the line never crosses the number
                  const lx = anchor === "middle" ? tx : tx + (anchor === "start" ? -6 : 6);
                  const ly = ty < y ? ty + 8 : ty - FS + 4;
                  const len = Math.hypot(lx - x, ly - y) || 1;
                  return <line x1={x + ((lx - x) / len) * 44} y1={y + ((ly - y) / len) * 44} x2={lx} y2={ly} stroke={theme.colors.ink} strokeWidth={2} opacity={0.6} />;
                })()
              : null}
            <text
              x={tx}
              y={ty}
              textAnchor={anchor}
              fontFamily={theme.fonts.zh}
              fontSize={FS}
              fill={theme.colors.ink}
              stroke={theme.colors.labelBg}
              strokeWidth={8}
              paintOrder="stroke"
            >
              {place.placeZh}
            </text>
          </g>
        ))}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 112,
          maxWidth: 1000,
          fontFamily: theme.fonts.zh,
          color: theme.colors.ink,
          opacity: interpolate(frame, [0, 0.3 * fps], [0, 1], clamp),
        }}
      >
        <div style={{ fontSize: 84, lineHeight: 1.1, letterSpacing: 4, marginTop: theme.space.xs, ...({ textWrap: "balance" } as React.CSSProperties) }}>{seg.title}</div>
      </div>
      {seg.overview && (anyDetour || multiDay) ? (
        <div style={{ opacity: interpolate(frame, [0.4 * fps, 0.8 * fps], [0, 1], clamp) }}>
          <RouteLegend theme={theme} left={40} top={1700} showDetour={anyDetour} days={multiDay ? dayKeys.map((d, k) => ({ day: d, color: dayColor(k) })) : []} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
