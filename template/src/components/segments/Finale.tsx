import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FINALE_SEC } from "../../lib/timeline";
import { FilmTheme } from "../../theme";
import { FilmData } from "../../types";
import { pinyon } from "../Cover";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.65, 0, 0.35, 1);

/*
 * Closing shot: back at the Mönchsberg wall at dusk (the cover was taken here too).
 * The three panels of the collage unroll one by one, top to bottom, like the scroll reveals in the
 * check-ins; then "So long, farewell" settles into the evening sky of the last panel.
 *
 *   0s          middle panel already up
 *   0.4 – 2.3s  top, then bottom panel unroll (0.9s each)
 *   2.6 – 3.4s  title lines fade in
 *   … – 6.1s    hold
 *   6.1 – 6.5s  dip to dark (the hostel shot fades in from dark)
 */
export const Finale: React.FC<{ film: FilmData; theme: FilmTheme }> = ({ film, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const fin = film.finale;
  if (!fin) return null;
  const sec = frame / fps;

  // cover the 9:16 frame with the whole collage
  const scale = Math.max(width / fin.width, height / fin.height);
  const w = fin.width * scale;
  const h = fin.height * scale;
  const left = (width - w) / 2;
  const top = (height - h) / 2;
  const panelH = h / fin.panels;

  // The middle panel (me at the wall) is up from frame 0 — same spot as the last check-in, so the cut
  // reads as continuous; the panels above and below then unroll around it.
  const mid = Math.floor(fin.panels / 2);
  const order = [mid, ...Array.from({ length: fin.panels }, (_, k) => k).filter((k) => k !== mid)];
  const unroll = (k: number) => {
    const n = order.indexOf(k);
    return n === 0 ? 1 : interpolate(sec, [0.4 + 1.0 * (n - 1), 1.3 + 1.0 * (n - 1)], [0, 1], { ...clamp, easing: ease });
  };
  const titleAt = 0.4 + 1.0 * (fin.panels - 1) + 0.3;
  const line = (k: number) => interpolate(sec, [titleAt + 0.25 * k, titleAt + 0.5 + 0.25 * k], [0, 1], { ...clamp, easing: ease });
  const out = interpolate(sec, [FINALE_SEC - 0.4, FINALE_SEC], [1, 0], clamp);
  const lastTop = top + panelH * (fin.panels - 1);

  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      <AbsoluteFill style={{ backgroundColor: theme.colors.bg, opacity: out }}>
        {Array.from({ length: fin.panels }, (_, k) => {
          const u = unroll(k);
          const pTop = top + panelH * k;
          return (
            <React.Fragment key={k}>
              <div style={{ position: "absolute", left: 0, top: pTop, width, height: panelH, overflow: "hidden", clipPath: `inset(0 ${100 - u * 100}% 0 0)` }}>
                <Img src={staticFile(fin.image)} style={{ position: "absolute", left, top: top - pTop, width: w, height: h, filter: theme.grade.filter }} />
              </div>
              {u > 0 && u < 1 ? (
                <div
                  style={{
                    position: "absolute",
                    left: u * width - 8,
                    top: pTop - 8,
                    width: 16,
                    height: panelH + 16,
                    background: "linear-gradient(90deg, #8a5a2b, #c89b6d, #6b4220)",
                    boxShadow: "0 3px 8px rgba(0,0,0,.45)",
                    opacity: interpolate(u, [0.85, 1], [1, 0], clamp),
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        })}

        {/* title in the evening sky of the last panel */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent ${(lastTop / height) * 100}%, rgba(20,24,40,${0.35 * line(0)}) ${((lastTop + panelH * 0.25) / height) * 100}%, transparent ${((lastTop + panelH * 0.6) / height) * 100}%)` }} />
        <div style={{ position: "absolute", left: 64, top: lastTop + 18, color: "#fff", textShadow: "0 2px 16px rgba(0,0,0,0.45)" }}>
          <div style={{ fontFamily: pinyon, fontSize: 112, lineHeight: 1.2, opacity: line(0), translate: `0px ${(1 - line(0)) * 14}px` }}>{fin.titleEn}</div>
          <div style={{ fontFamily: theme.fonts.zh, fontWeight: 900, fontSize: 56, letterSpacing: 8, marginTop: 2, opacity: line(1) }}>{fin.titleZh}</div>
          {fin.subtitle ? (
            <div style={{ fontFamily: theme.fonts.latin, fontSize: 32, letterSpacing: 6, marginTop: 12, opacity: line(2) * 0.9 }}>{fin.subtitle}</div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
