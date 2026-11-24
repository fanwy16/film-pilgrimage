import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FilmTheme } from "../../theme";
import { FilmData } from "../../types";
import { FilmCover } from "../Cover";
import { VinylIntro } from "../ui/VinylIntro";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const TitleCard: React.FC<{ film: FilmData; theme: FilmTheme }> = ({ film, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const cover = film.cover;
  const entryScale = interpolate(frame, [0, 0.3 * fps], [1.005, 1], clamp);
  const entryY = interpolate(frame, [0, 0.3 * fps], [8, 0], clamp);

  if (cover?.kind === "topText" || cover?.kind === "merged") {
    return (
      <AbsoluteFill>
        <FilmCover filmId={film.id} w={width} h={height} feed={false} animate />
        {/* e.g. Before Sunrise: click the record to start the music */}
        {theme.opening === "vinyl" ? <VinylIntro theme={theme} cx={850} cy={1560} r={140} /> : null}
      </AbsoluteFill>
    );
  }

  if (cover?.kind === "fullbleed") {
    return (
      <AbsoluteFill style={{ backgroundColor: theme.colors.bg, overflow: "hidden" }}>
        <Img
          src={staticFile(cover.image)}
          style={{ position: "absolute", inset: 0, width, height, objectFit: "cover", filter: theme.grade.filter, transform: `scale(${entryScale})` }}
        />
        <div style={{ position: "absolute", inset: 0, backgroundColor: theme.grade.tint }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.3) 56%, rgba(0,0,0,0.88) 100%)" }} />
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 150, maxWidth: 952, color: "white", textAlign: "left", display: "flex", flexDirection: "column", gap: theme.space.s, transform: `translateY(${entryY}px)` }}>
          <div style={{ fontFamily: theme.fonts.latin, fontSize: 42, lineHeight: 1.2, letterSpacing: 8, marginBottom: theme.space.s, ...({ textWrap: "balance" } as React.CSSProperties) }}>FILM PILGRIMAGE · 取景地巡礼</div>
          <div style={{ fontFamily: theme.fonts.latin, fontStyle: "italic", fontSize: 120, lineHeight: 0.95, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.title}</div>
          <div style={{ fontFamily: theme.fonts.zh, fontSize: 88, lineHeight: 1.2, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.titleZh}</div>
          <div style={{ fontFamily: theme.fonts.latin, fontSize: 42, lineHeight: 1.2, letterSpacing: 3, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.year} · {film.city} {film.cityZh}</div>
          <div style={{ fontFamily: theme.fonts.latin, fontSize: 38, lineHeight: 1.2, letterSpacing: 4, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.dates}</div>
        </div>
      </AbsoluteFill>
    );
  }

  if (cover?.kind === "merged") {
    const coverHeight = (width * cover.height) / cover.width;
    const coverTop = height - coverHeight - 32;
    return (
      <AbsoluteFill style={{ backgroundColor: theme.colors.bg, color: theme.colors.ink, textAlign: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 64, right: 64, top: 110, maxWidth: 952, display: "flex", flexDirection: "column", gap: theme.space.s, transform: `translateY(${entryY}px)` }}>
          <div style={{ fontFamily: theme.fonts.latin, fontSize: 40, lineHeight: 1.2, letterSpacing: 8, color: theme.colors.muted }}>FILM PILGRIMAGE · 取景地巡礼</div>
          <div style={{ fontFamily: theme.fonts.latin, fontStyle: "italic", fontSize: 120, lineHeight: 1, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.title}</div>
          <div style={{ fontFamily: theme.fonts.zh, fontSize: 88, lineHeight: 1.1, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.titleZh}</div>
          <div style={{ fontFamily: theme.fonts.latin, fontSize: 42, lineHeight: 1.2, letterSpacing: 3, color: theme.colors.muted, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.year} · {film.city} {film.cityZh}</div>
          <div style={{ fontFamily: theme.fonts.latin, fontSize: 38, lineHeight: 1.2, letterSpacing: 4, color: theme.colors.muted, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.dates}</div>
        </div>
        <div style={{ position: "absolute", left: 0, top: coverTop, width, height: coverHeight, overflow: "hidden", transform: `scale(${entryScale})` }}>
          <Img
            src={staticFile(cover.image)}
            style={{ position: "absolute", left: 0, top: 0, width, height: coverHeight, objectFit: "contain", filter: theme.grade.filter }}
          />
          <div style={{ position: "absolute", inset: 0, backgroundColor: theme.grade.tint, pointerEvents: "none" }} />
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, color: theme.colors.ink }}>
      <div style={{ position: "absolute", left: 64, right: 64, top: 110, maxWidth: 952, display: "flex", flexDirection: "column", gap: theme.space.s }}>
        <div style={{ fontFamily: theme.fonts.latin, fontSize: 36, lineHeight: 1.2, letterSpacing: 8 }}>FILM PILGRIMAGE · 取景地巡礼</div>
        <div style={{ fontFamily: theme.fonts.latin, fontStyle: "italic", fontSize: 120, lineHeight: 1, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.title}</div>
        <div style={{ fontFamily: theme.fonts.zh, fontSize: 88, lineHeight: 1.1, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.titleZh}</div>
        <div style={{ fontFamily: theme.fonts.latin, fontSize: 42, lineHeight: 1.2, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.year} · {film.city} {film.cityZh}</div>
        <div style={{ fontFamily: theme.fonts.latin, fontSize: 38, lineHeight: 1.2, ...({ textWrap: "balance" } as React.CSSProperties) }}>{film.dates}</div>
      </div>
    </AbsoluteFill>
  );
};
