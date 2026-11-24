import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FilmTheme } from "../../theme";
import { FilmData, Location } from "../../types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Top caption: Chinese name, German name, film scene (+ film time). */
export const Caption: React.FC<{ location: Location; film: FilmData; theme: FilmTheme; scene: string | null }> = ({
  location,
  film,
  theme,
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = theme.timing.captionFadeSec * fps;
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const { colors, fonts } = theme;

  const sceneLine = location.isFilmingLocation
    ? [scene ? (theme.sceneMark === "note" ? `♪ ${scene}` : `「${scene}」`) : null, location.filmTime ? `片中 ${location.filmTime}` : null]
        .filter(Boolean)
        .join("   ")
    : "湖区 · 番外";

  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        right: 40,
        top: 160,
        maxWidth: 1000,
        opacity: interpolate(frame, [0, fade], [0, 1], { ...clamp, easing: ease }),
        translate: interpolate(frame, [0, fade], ["0px 24px", "0px 0px"], { ...clamp, easing: ease }),
      }}
    >
      <div style={{ fontFamily: fonts.zh, fontSize: 72, color: colors.ink, letterSpacing: 4, lineHeight: 1.08, maxWidth: 1000, ...({ textWrap: "balance" } as React.CSSProperties) }}>
        {location.placeZh}
      </div>
      {/* German name and scene on their own lines, as before (a stacked, more editorial block) */}
      <div style={{ display: "flex", flexDirection: "column", rowGap: theme.space.xs, marginTop: theme.space.xs, maxWidth: 1000 }}>
        <div style={{ fontFamily: fonts.latin, fontStyle: "italic", fontSize: 42, lineHeight: 1.2, color: colors.muted, letterSpacing: 1, ...({ textWrap: "balance" } as React.CSSProperties) }}>
          {location.place}
        </div>
        {sceneLine ? (
          <div style={{ fontFamily: `${fonts.latin}, ${fonts.zh}`, fontSize: 34, lineHeight: 1.2, color: colors.accent, letterSpacing: 2, ...({ textWrap: "balance" } as React.CSSProperties) }}>
            {sceneLine}
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** Top-left running index: DAY 1 · 03 / 05 or Do ♪ */
export const Header: React.FC<{ day: number | null; index: number; total: number; theme: FilmTheme; showDay: boolean }> = ({
  day,
  index,
  total,
  theme,
  showDay,
}) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const solfege = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti", "Do'"];
  const indexLabel = theme.indexStyle === "solfege" ? `${solfege[(index - 1) % solfege.length]}  ♪` : `${pad(index)} / ${pad(total)}`;
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        top: 112,
        maxWidth: 1000,
        fontFamily: theme.fonts.latin,
        fontSize: 32,
        lineHeight: 1.2,
        letterSpacing: 4,
        color: theme.colors.muted,
        ...({ textWrap: "balance" } as React.CSSProperties),
      }}
    >
      {showDay && day !== null && theme.indexStyle === "number" ? `DAY ${day}  ·  ` : ""}
      {indexLabel}
    </div>
  );
};
