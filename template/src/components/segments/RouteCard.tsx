import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { boundsOf, cameraForBounds, legPath, makeProjection, smoothPath } from "../../lib/geo";
import { visitedInRouteOrder } from "../../lib/timeline";
import { FilmTheme } from "../../theme";
import { FilmData, Location, Shot } from "../../types";
import { MapBackground } from "../map/MapBackground";
import { Marker, RouteLine } from "../map/Overlays";
import { GradedImage } from "../ui/GradedImage";
import { RouteLegend } from "../map/RouteLegend";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const TITLE_H = 250;
const MAP_TOP = 250;
const MAP_H = 1080;
const LIST_TOP = MAP_TOP + MAP_H + 26; // 1356 → rows end before 1816 (小红书 UI safe area)
const ROW_H = 88;
const THUMB_W = 150;
const THUMB_H = 84;

/** Film still of a stop's first shot, as a small 16:9 thumbnail. */
const StillThumb: React.FC<{ shot: Shot; theme: FilmTheme }> = ({ shot, theme }) => {
  const scale = THUMB_W / shot.width;
  const halfH = shot.height * (shot.splitRatio ?? 0.5) * scale;
  return (
    <div style={{ position: "relative", width: THUMB_W, height: THUMB_H, overflow: "hidden", flexShrink: 0, outline: `3px solid ${theme.colors.labelBg}`, boxShadow: "0 3px 10px rgba(0,0,0,0.25)" }}>
      <GradedImage src={shot.image} width={THUMB_W} height={shot.height * scale} theme={theme} style={{ top: -(halfH - THUMB_H) / 2 }} />
    </div>
  );
};

export const RouteCard: React.FC<{ film: FilmData; theme: FilmTheme; days: number[] | null }> = ({ film, theme, days }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { colors, fonts } = theme;
  const locations = visitedInRouteOrder(film, { days });
  const points = [film.start, ...locations];
  const camera = cameraForBounds(boundsOf(points), 1080, MAP_H, 100);
  const project = makeProjection(camera, 1080, MAP_H);
  const pts = points.map((p) => project(p.lat, p.lng));
  // one line per trip day, each starting from the hotel / hostel
  const dayKeys = [...new Set(locations.map((l) => l.day))];
  const multiDay = dayKeys.length > 1;
  const dayColor = (d: number | null) => (multiDay ? colors.dayColors[dayKeys.indexOf(d) % colors.dayColors.length] : colors.route);
  const dayLines = dayKeys.map((d) => ({
    day: d,
    pts: [pts[0], ...locations.flatMap((l, i) => (l.day === d ? [pts[i + 1]] : []))],
    stops: locations.filter((l) => l.day === d),
  }));
  const draw = interpolate(frame, [0.2 * fps, 1.6 * fps], [0, 1], clamp);
  const loop = film.start.photo?.at === "end";
  const loopIn = interpolate(frame, [1.6 * fps, 2.1 * fps], [0, 1], clamp);
  const date = film.days.length > 1 ? `${film.days[0].date} – ${film.days[film.days.length - 1].date}` : film.days.map((d) => d.date).join("");
  const bd = film.routeBackdrop;
  const paper = colors.bg;

  return (
    <AbsoluteFill style={{ backgroundColor: paper, color: colors.ink }}>
      {/* title band over a faded photo (echoes the cover) */}
      {bd ? (
        <div style={{ position: "absolute", left: 0, top: 0, width, height: TITLE_H, overflow: "hidden" }}>
          <Img src={staticFile(bd.image)} style={{ position: "absolute", left: 0, top: 0, width, height: (width * bd.height) / bd.width, filter: "saturate(0.8)" }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${paper}99 0%, ${paper}cc 60%, ${paper} 100%)` }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 64, top: 70 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: fonts.latin, fontSize: 26, letterSpacing: 8, fontWeight: 600, color: colors.accent }}>
          <div style={{ width: 48, height: 2, backgroundColor: colors.accent }} />
          ROUTE
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 10 }}>
          <span style={{ fontFamily: fonts.zh, fontWeight: 900, fontSize: 72, letterSpacing: 4 }}>巡礼路线</span>
          <span style={{ fontFamily: fonts.latin, fontSize: 32, color: colors.muted, letterSpacing: 2 }}>{date}</span>
        </div>
      </div>

      {/* map */}
      <div style={{ position: "absolute", left: 0, top: MAP_TOP, width: 1080, height: MAP_H, overflow: "hidden" }}>
        <MapBackground camera={camera} width={1080} height={MAP_H} features={film.mapFeatures} theme={theme} />
        <svg width={1080} height={MAP_H} style={{ position: "absolute", inset: 0 }}>
          {/* each day drawn leg by leg; a leg into a "detour" stop (explored elsewhere in between) is dashed */}
          {dayLines.map((line, k) => {
            const dayP = interpolate(draw, [k / dayLines.length, (k + 1) / dayLines.length], [0, 1], clamp);
            const n = line.pts.length - 1;
            return line.stops.map((stop, j) => {
              const p = Math.min(1, Math.max(0, dayP * n - j));
              const d = legPath(line.pts, j);
              return stop.detour ? (
                <path key={`${k}-${j}`} d={d} fill="none" stroke={dayColor(line.day)} strokeWidth={6} strokeDasharray="4 16" strokeLinecap="round" opacity={p} />
              ) : (
                <RouteLine key={`${k}-${j}`} d={d} progress={p} color={dayColor(line.day)} />
              );
            });
          })}
          {loop && pts.length > 2 ? (
            <path d={smoothPath([pts[pts.length - 1], pts[0]], -0.22)} fill="none" stroke={colors.route} strokeWidth={5} strokeDasharray="3 14" strokeLinecap="round" opacity={0.75 * loopIn} />
          ) : null}
          <Marker x={pts[0][0]} y={pts[0][1]} pop={1} theme={theme} hollow />
          {locations.map((loc, i) => (
            <Marker
              key={loc.id}
              x={pts[i + 1][0]}
              y={pts[i + 1][1]}
              pop={interpolate(frame, [0.2 * fps + (1.4 * fps * (i + 1)) / locations.length - 4, 0.2 * fps + (1.4 * fps * (i + 1)) / locations.length + 4], [0, 1], clamp)}
              theme={theme}
              number={i + 1}
              color={dayColor(loc.day)}
            />
          ))}
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 60, background: `linear-gradient(180deg, transparent, ${paper})` }} />
        {locations.some((l) => l.detour) || multiDay ? (
          <RouteLegend theme={theme} left={40} top={MAP_H - 84} showDetour={locations.some((l) => l.detour)} days={multiDay ? dayKeys.map((d) => ({ day: d, color: dayColor(d) })) : []} />
        ) : null}
      </div>

      {/* stop list with film-still thumbnails (grouped by day on multi-day trips) */}
      <div style={{ position: "absolute", left: 64, right: 64, top: LIST_TOP }}>
        {locations.map((loc: Location, i) => {
          const a = interpolate(frame, [0.3 * fps + i * 4, 0.3 * fps + i * 4 + 8], [0, 1], clamp);
          const header = multiDay && (i === 0 || locations[i - 1].day !== loc.day);
          const rowH = multiDay ? ROW_H - 14 : ROW_H;
          return (
            <React.Fragment key={loc.id}>
              {header ? (
                <div style={{ fontFamily: fonts.latin, fontSize: 28, letterSpacing: 4, fontWeight: 600, color: dayColor(loc.day), height: 40, lineHeight: "40px", opacity: a }}>
                  DAY {loc.day} · {film.days.find((d) => d.day === loc.day)?.date ?? ""}
                </div>
              ) : null}
              <div style={{ display: "flex", alignItems: "center", gap: 22, height: rowH, opacity: a }}>
                <div style={{ transform: multiDay ? "scale(0.85)" : undefined, transformOrigin: "left center" }}>
                  <StillThumb shot={loc.shots[0]} theme={theme} />
                </div>
                <div style={{ minWidth: 0, marginLeft: multiDay ? -22 : 0 }}>
                  <div style={{ fontFamily: fonts.zh, fontSize: 36, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: dayColor(loc.day), fontWeight: 700 }}>{String.fromCodePoint(0x2460 + i)}</span> {loc.placeZh}{" "}
                    {/* first part of the German name only, so long names stay on screen */}
                    <span style={{ fontFamily: fonts.latin, fontStyle: "italic", fontSize: 30, color: colors.muted }}>{loc.place.split(" · ")[0]}</span>
                  </div>
                  {loc.tipZh ? (
                    <div style={{ fontFamily: fonts.zh, fontSize: 24, color: colors.accent, marginTop: 2, whiteSpace: "nowrap" }}>TIP · {loc.tipZh}</div>
                  ) : null}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
