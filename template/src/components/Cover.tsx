import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadBodoni } from "@remotion/google-fonts/BodoniModa";
import { loadFont as loadPinyon } from "@remotion/google-fonts/PinyonScript";
import "../fonts";
import { FILMS } from "../data";
import { THEMES } from "../theme";
import { FilmId } from "../types";

/*
 * Cover / title-card designs. Left-aligned, layered type.
 * Fonts are look-alikes chosen for mood, not the films' actual title lettering:
 *   Sound of Music → Pinyon Script (romantic 1960s script) + Songti SC Black
 *   Before Sunrise → Bodoni Moda italic (1990s high-contrast serif) + Songti SC Light
 */
export const pinyon = loadPinyon("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const bodoni = loadBodoni("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily;
loadBodoni("normal", { weights: ["500"], subsets: ["latin"] });

const SONG = '"Songti SC", "STSong", serif';

export type CoverProps = { filmId: FilmId; bg?: string };
export const COVER_SIZE = { width: 1080, height: 1440 };

/** Shows the region [sx, sy, sw, sh] (source pixels) of an image scaled to fill a w×h box. */
const Crop: React.FC<{
  src: string;
  imgW: number;
  imgH: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  w: number;
  h: number;
  filter?: string;
  style?: React.CSSProperties;
}> = ({ src, imgW, imgH, sx, sy, sw, sh, w, h, filter, style }) => {
  const s = Math.max(w / sw, h / sh);
  const dx = -(sx * s) - (sw * s - w) / 2;
  const dy = -(sy * s) - (sh * s - h) / 2;
  return (
    <div style={{ position: "absolute", width: w, height: h, overflow: "hidden", ...style }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: dx, top: dy, width: imgW * s, height: imgH * s, filter }} />
    </div>
  );
};

/** Small vertical running text along the right edge (reads top → bottom). */
const SideText: React.FC<{ text: string; color: string; top: number; font: string }> = ({ text, color, top, font }) => (
  <div style={{ position: "absolute", right: 64, top, writingMode: "vertical-rl", fontFamily: font, fontSize: 24, letterSpacing: 10, color, whiteSpace: "nowrap" }}>
    {text}
  </div>
);

const spotsOf = (filmId: FilmId) => FILMS[filmId].locations.filter((l) => l.visited && l.isFilmingLocation).length;

/** Sound of Music: paper, type block top-left, film-vs-me pair below; the script title overlaps the Chinese title. */
const SOM_BG = { image: "raw/salzburg/bg-mountains.jpg", width: 1800, height: 1004 };

export const SoundOfMusicCover: React.FC<{ w: number; h: number; feed: boolean; bg?: string }> = ({ w, h, feed, bg = SOM_BG.image }) => {
  const film = FILMS["sound-of-music"];
  const theme = THEMES["sound-of-music"];
  const { colors } = theme;
  const cover = film.cover!;
  const half = cover.height / 2;
  const textH = feed ? 490 : 640;
  const halfH = Math.min((w * half) / cover.width, (h - textH - 8) / 2);
  const imgTop = h - halfH * 2 - 8;
  const L = 64;
  const stamp: React.CSSProperties = { position: "absolute", left: 64, fontFamily: pinyon, fontSize: 64, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.6)" };
  // Background photo behind the type block, sky at the top fading into paper so the type stays readable.
  const bgBoxH = imgTop;
  const bgScale = Math.max(w / SOM_BG.width, bgBoxH / SOM_BG.height);
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <Crop
        src={bg}
        imgW={SOM_BG.width}
        imgH={SOM_BG.height}
        sx={(SOM_BG.width - w / bgScale) / 2}
        sy={(SOM_BG.height - bgBoxH / bgScale) * 0.25}
        sw={w / bgScale}
        sh={bgBoxH / bgScale}
        w={w}
        h={bgBoxH}
        filter="saturate(0.75) contrast(0.78) brightness(1.18)"
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: bgBoxH,
          background:
            "linear-gradient(180deg, rgba(244,236,223,0.88) 0%, rgba(244,236,223,0.6) 45%, rgba(244,236,223,0.6) 75%, rgba(244,236,223,0.45) 100%)",
        }}
      />
      <Crop src={cover.image} imgW={cover.width} imgH={cover.height} sx={0} sy={0} sw={cover.width} sh={half} w={w} h={halfH} filter={theme.grade.filter} style={{ top: imgTop }} />
      <Crop
        src={cover.image}
        imgW={cover.width}
        imgH={cover.height}
        sx={0}
        sy={half}
        sw={cover.width}
        sh={half}
        w={w}
        h={halfH}
        filter={theme.grade.filter}
        style={{ top: imgTop + halfH + 8 }}
      />
      <div style={{ ...stamp, top: imgTop + halfH - 92 }}>1965</div>
      <div style={{ ...stamp, top: imgTop + halfH * 2 + 8 - 92, left: "auto", right: 64 }}>2026</div>

      <div style={{ position: "absolute", left: L, right: 64, top: feed ? 60 : 110, maxWidth: 952, display: "flex", flexDirection: "column", gap: theme.space.s }}>
        <div style={{ display: "flex", alignItems: "center", gap: theme.space.s, fontFamily: theme.fonts.latin, fontSize: 28, lineHeight: 1.2, letterSpacing: 8, color: colors.muted, fontWeight: 600 }}>
          <div style={{ width: 56, height: 2, flexShrink: 0, backgroundColor: colors.accent }} />
          <span style={{ ...({ textWrap: "balance" } as React.CSSProperties) }}>FILM PILGRIMAGE · SALZBURG</span>
        </div>
        <div style={{ fontFamily: SONG, fontWeight: 900, fontSize: feed ? 128 : 168, lineHeight: 1, letterSpacing: 2, color: colors.ink, ...({ textWrap: "balance" } as React.CSSProperties) }}>
          音乐之声
        </div>
        <div style={{ fontFamily: pinyon, fontSize: feed ? 88 : 110, lineHeight: 1.2, color: colors.accent, maxWidth: 952, ...({ textWrap: "balance" } as React.CSSProperties) }}>
          The Sound of Music
        </div>
        <div style={{ fontFamily: SONG, fontSize: feed ? 36 : 40, lineHeight: 1.2, color: colors.ink, letterSpacing: 6, maxWidth: 952 }}>
          萨尔茨堡 · 取景地巡礼
        </div>
        <div style={{ fontFamily: SONG, fontSize: 30, lineHeight: 1.2, color: colors.muted, letterSpacing: 3, maxWidth: 952, ...({ textWrap: "balance" } as React.CSSProperties) }}>
          {feed ? `一个下午 · ${spotsOf("sound-of-music")} 个取景地 · 附路线` : film.dates}
        </div>
      </div>
      <SideText text="1965 — 2026" color={colors.muted} top={feed ? 60 : 110} font={theme.fonts.latin} />
    </AbsoluteFill>
  );
};

/** Small static record (the video opens by clicking one; on the cover it's a detail). */
const StaticVinyl: React.FC<{ cx: number; cy: number; r: number; font: string; arm?: boolean }> = ({ cx, cy, r, font, arm = false }) => (
  <svg width={r * 2 + 60} height={r * 2 + 40} style={{ position: "absolute", left: cx - r - 10, top: cy - r - 30, overflow: "visible" }}>
    <circle cx={r + 16} cy={r + 40} r={r} fill="rgba(0,0,0,0.45)" />
    <defs>
      <radialGradient id="cv-sheen" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.26)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
    </defs>
    <g transform={`translate(${r + 10} ${r + 30}) rotate(-18)`}>
      <circle r={r} fill="#0d0d0f" stroke="rgba(255,255,255,0.28)" strokeWidth={2} />
      {Array.from({ length: 9 }, (_, k) => (
        <circle key={k} r={r * (0.42 + (k * 0.52) / 9)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}
      <circle r={r * 0.34} fill="#c8553d" />
      <text y={-r * 0.06} textAnchor="middle" fontFamily={font} fontSize={r * 0.12} fill="#fff" letterSpacing={1}>COME HERE</text>
      <text y={r * 0.14} textAnchor="middle" fontFamily={font} fontStyle="italic" fontSize={r * 0.08} fill="rgba(255,255,255,0.85)">Side A</text>
      <circle r={3} fill="#e9e4da" />
      <circle r={r} fill="url(#cv-sheen)" />
    </g>
    {arm ? (
      // tonearm resting on the record, same as the video's opening
      <g transform={`translate(${r + 10} ${r + 30})`}>
        <circle cx={r * 0.95} cy={-r * 0.95} r={r * 0.11} fill="#b9b3a7" stroke="#57524a" strokeWidth={2} />
        <line x1={r * 0.95} y1={-r * 0.95} x2={r * 0.55} y2={r * 0.25} stroke="#cfc9bd" strokeWidth={r * 0.05} strokeLinecap="round" />
        <rect x={r * 0.47} y={r * 0.2} width={r * 0.19} height={r * 0.12} rx={3} fill="#8e887d" transform={`rotate(-20 ${r * 0.55} ${r * 0.25})`} />
      </g>
    ) : null}
  </svg>
);

/**
 * Before Sunrise.
 * 3:4 feed cover: the record-shop collage re-cut into three bands (me browsing, the shop window, the
 * poster on the wall), first and third cut tight so they read at thumbnail size; type darkened only on the
 * left so I stay visible; the record with tonearm sits on the poster band.
 * 9:16 title card (video frame 0): the whole collage with the type block top-left; the clickable record sits
 * on the poster panel (VinylIntro). After the click, the middle panel squeezes and the other two open up.
 */
export const BeforeSunriseCover: React.FC<{ w: number; h: number; feed: boolean; animate?: boolean }> = ({ w, h, feed, animate = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const film = FILMS["before-sunrise"];
  const theme = THEMES["before-sunrise"];
  const { colors } = theme;
  const cover = film.cover!;
  const L = 64;
  const cream = "#f2efe8";
  const balance = { textWrap: "balance" } as React.CSSProperties;
  const kicker = (size: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: theme.space.s }}>
      <div style={{ width: 48, height: 2, flexShrink: 0, backgroundColor: colors.accent }} />
      <div style={{ fontFamily: SONG, fontWeight: 700, fontSize: size, letterSpacing: 6, color: colors.accent }}>电影取景地巡礼</div>
      <div style={{ fontFamily: bodoni, fontWeight: 500, fontSize: size * 0.75, letterSpacing: 6, color: colors.accent }}>· VIENNA</div>
    </div>
  );

  if (feed) {
    // three record-shop bands, top and bottom cut tight around their subject: me browsing, the shop window, the poster
    const bands = cover.feedBands ?? [[0, 0, cover.width, cover.height]];
    // the shop-window photo is the main image (~half the cover); title band only as tall as the type needs
    const heights = [380, 720, h - 380 - 720 - 16];
    const tops = [0, 388, 1116];
    return (
      <AbsoluteFill style={{ backgroundColor: "#0e0f11" }}>
        {bands.map(([sx, sy, sw, sh], i) => (
          <Crop key={i} src={cover.image} imgW={cover.width} imgH={cover.height} sx={sx} sy={sy} sw={sw} sh={sh} w={w} h={heights[i]} filter={theme.grade.filter} style={{ top: tops[i] }} />
        ))}
        {/* darken only where the type sits (left), so I stay visible on the right */}
        <div style={{ position: "absolute", left: 0, top: 0, width: w, height: heights[0], background: "linear-gradient(90deg, rgba(10,12,14,0.9) 0%, rgba(10,12,14,0.78) 42%, rgba(10,12,14,0.25) 62%, transparent 72%)" }} />
        <div style={{ position: "absolute", left: L, top: 48, color: cream, display: "flex", flexDirection: "column", gap: theme.space.s }}>
          {kicker(32)}
          {/* one lead: the Chinese title; English italic at about half its size, one line */}
          <div style={{ fontFamily: SONG, fontWeight: 900, fontSize: 84, lineHeight: 1.1, letterSpacing: 4, marginTop: theme.space.xs, ...balance }}>爱在黎明破晓前</div>
          {/* Latin cap height is ~0.7em vs ~0.9em for CJK: 64px here reads as ~0.6× the Chinese title */}
          <div style={{ fontFamily: bodoni, fontStyle: "italic", fontSize: 64, lineHeight: 1, letterSpacing: -0.5 }}>Before Sunrise</div>
          <div style={{ fontFamily: SONG, fontSize: 30, letterSpacing: 4, color: "rgba(242,239,232,0.8)" }}>1995 → 2026</div>
        </div>
        {/* the record sits on the seam between the shop window and the poster */}
        <StaticVinyl cx={w - 165} cy={tops[2] - 4} r={110} font={theme.fonts.latin} arm />
        <div
          style={{
            position: "absolute",
            left: 24,
            top: tops[2] + heights[2] - 24 - 44,
            padding: "6px 16px",
            backgroundColor: "rgba(10,12,14,0.78)",
            color: cream,
            fontFamily: SONG,
            fontSize: 26,
            letterSpacing: 2,
          }}
        >
          店里挂着的《爱在》海报
        </div>
      </AbsoluteFill>
    );
  }

  // 9:16 title card. At frame 0 it's the full three-panel collage (the cover). After the record is clicked
  // (see VinylIntro), the middle panel squeezes toward its centre and the first and third panels open up and
  // zoom in on their subject (me browsing records / the Before Sunrise poster), while the title fades away.
  const sec = animate ? frame / fps : 0;
  const squeeze = interpolate(sec, [OPENING_SQUEEZE_SEC, OPENING_SQUEEZE_SEC + 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const titleA = 1 - interpolate(sec, [OPENING_SQUEEZE_SEC - 0.1, OPENING_SQUEEZE_SEC + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const panelH = cover.height / 3;
  const heights = [640 + 140 * squeeze, 640 - 280 * squeeze, 640 + 140 * squeeze];
  const tops = [0, heights[0], heights[0] + heights[1]];
  const focus: [number, number][] = [
    [0.66, 0.62], // me browsing records
    [0.5, 0.78], // me at the shop window
    [0.3, 0.45], // the Before Sunrise poster
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      {heights.map((bh, k) => (
        <FocusBand key={k} src={cover.image} imgW={cover.width} sy={panelH * k} sh={panelH} fx={focus[k][0]} fy={focus[k][1]} w={w} h={bh} top={tops[k]} filter={theme.grade.filter} />
      ))}
      {/* darken only behind the type (left of the top panel), so me browsing records stays visible on the right */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: heights[0],
          opacity: titleA,
          background: "linear-gradient(90deg, rgba(10,12,14,0.9) 0%, rgba(10,12,14,0.8) 40%, rgba(10,12,14,0.3) 60%, transparent 70%)",
          WebkitMaskImage: "linear-gradient(180deg, black 88%, transparent 100%)",
        }}
      />
      <div style={{ position: "absolute", left: L, top: 120, color: cream, display: "flex", flexDirection: "column", gap: theme.space.s, opacity: titleA, translate: `0px ${(1 - titleA) * -20}px` }}>
        {kicker(32)}
        {/* one lead: the Chinese title; English italic at about half its size, one line */}
        <div style={{ fontFamily: SONG, fontWeight: 900, fontSize: 96, lineHeight: 1.1, letterSpacing: 4, marginTop: theme.space.xs, ...balance }}>爱在黎明破晓前</div>
        {/* Latin cap height is ~0.7em vs ~0.9em for CJK: 72px here reads as ~0.6× the Chinese title */}
        <div style={{ fontFamily: bodoni, fontStyle: "italic", fontSize: 72, lineHeight: 1, letterSpacing: -0.5 }}>Before Sunrise</div>
        <div style={{ fontFamily: theme.fonts.latin, fontSize: 32, letterSpacing: 6, color: "rgba(242,239,232,0.7)", marginTop: theme.space.xs }}>1995 → 2026</div>
      </div>
    </AbsoluteFill>
  );
};

/** When the Before Sunrise opening starts squeezing the middle panel (after the record starts playing). */
export const OPENING_SQUEEZE_SEC = 2.1;

/** One collage panel in a band of height h: scaled to cover, kept centred on the focal point (fx, fy) as it resizes. */
const FocusBand: React.FC<{ src: string; imgW: number; sy: number; sh: number; fx: number; fy: number; w: number; h: number; top: number; filter: string }> = ({
  src,
  imgW,
  sy,
  sh,
  fx,
  fy,
  w,
  h,
  top,
  filter,
}) => {
  const s = Math.max(w / imgW, h / sh);
  const dw = imgW * s;
  const dh = sh * s;
  const ox = Math.min(0, Math.max(w - dw, w / 2 - fx * dw));
  const oy = Math.min(0, Math.max(h - dh, h / 2 - fy * dh));
  return (
    <div style={{ position: "absolute", left: 0, top, width: w, height: h, overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: ox, top: oy - sy * s, width: dw, height: (dh * 3 * imgW) / imgW, filter }} />
    </div>
  );
};

/**
 * Starting-point cover for a new film: the cover image fills the frame, a dark gradient on the left,
 * left-aligned layered type (kicker → Chinese title → English italic at ~0.6× → years).
 * Replace it with a bespoke design per film (add it to COVERS below), like the two above.
 */
export const GenericCover: React.FC<{ filmId: FilmId; w: number; h: number; feed: boolean }> = ({ filmId, w, h, feed }) => {
  const film = FILMS[filmId];
  const theme = THEMES[filmId];
  const img = film.cover;
  const top = feed ? 120 : 200;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, overflow: "hidden" }}>
      {img ? <Img src={staticFile(img.image)} style={{ position: "absolute", inset: 0, width: w, height: h, objectFit: "cover", filter: theme.grade.filter }} /> : null}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.25) 55%, transparent 80%)" }} />
      <div style={{ position: "absolute", left: 64, top, maxWidth: w - 160, color: "white", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: SONG, fontSize: 30, letterSpacing: 6, opacity: 0.85 }}>电影取景地巡礼 · {film.city.toUpperCase()}</div>
        <div style={{ fontFamily: SONG, fontWeight: 900, fontSize: feed ? 84 : 96, lineHeight: 1.15 }}>{film.titleZh}</div>
        <div style={{ fontFamily: bodoni, fontStyle: "italic", fontSize: feed ? 52 : 60, lineHeight: 1.1 }}>{film.title}</div>
        <div style={{ fontFamily: theme.fonts.latin, fontSize: 34, letterSpacing: 4, marginTop: 8, opacity: 0.85 }}>
          {film.year} → {film.dates.slice(0, 4)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

type CoverDesign = React.FC<{ w: number; h: number; feed: boolean; bg?: string; animate?: boolean }>;
/** Bespoke cover per film. Films not listed here get GenericCover. */
const COVERS: Record<string, CoverDesign> = {
  "sound-of-music": ({ bg, animate: _animate, ...rest }) => <SoundOfMusicCover {...rest} bg={bg} />,
  "before-sunrise": ({ bg: _bg, ...rest }) => <BeforeSunriseCover {...rest} />,
};

export const FilmCover: React.FC<{ filmId: FilmId; w: number; h: number; feed: boolean; bg?: string; animate?: boolean }> = ({ filmId, ...rest }) => {
  const Design = COVERS[filmId];
  return Design ? <Design {...rest} /> : <GenericCover filmId={filmId} w={rest.w} h={rest.h} feed={rest.feed} />;
};

/** 3:4 feed cover composition. */
export const Cover: React.FC<CoverProps> = ({ filmId, bg }) => <FilmCover filmId={filmId} bg={bg} w={COVER_SIZE.width} h={COVER_SIZE.height} feed />;
