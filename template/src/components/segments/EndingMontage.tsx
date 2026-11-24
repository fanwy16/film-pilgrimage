import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MONTAGE_OVERLAP_SEC, montageItemFrames, MontageItem, Segment } from "../../lib/timeline";
import { FilmTheme } from "../../theme";
import { bodoni, pinyon } from "../Cover";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.65, 0, 0.35, 1);

/*
 * Scenery montage. Every image fills the 9:16 frame (all montage sources are 9:16 collages or portraits;
 * no blurred-background letterboxing). Images dissolve into each other.
 * - pan: a tall image (two photos stacked) holds on its top, slides to its bottom, holds.
 * - chapter: big film-font line ("Day 2", "After Sunrise") + Chinese line, top-left, layered like the cover.
 * - label: small place name, bottom-left, above the 小红书 UI safe area.
 */
export const EndingMontage: React.FC<{ seg: Extract<Segment, { kind: "montage" }>; theme: FilmTheme }> = ({ seg, theme }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const overlap = Math.round(MONTAGE_OVERLAP_SEC * fps);
  const script = theme.scriptFont === "pinyon" ? pinyon : bodoni;

  // start frame and duration of each item (same rule as timeline.ts)
  const durs = seg.items.map((item) => montageItemFrames(item, seg.itemFrames));
  const starts: number[] = [];
  durs.reduce((acc, d, i) => {
    starts[i] = acc;
    return acc + d - overlap;
  }, 0);

  const visible = seg.items.map((_, i) => i).filter((i) => frame >= starts[i] && frame < starts[i] + durs[i]);
  // opacity of item i: fades in over `overlap` frames (except the first item)
  const alpha = (i: number) => (i === 0 ? 1 : interpolate(frame - starts[i], [0, overlap], [0, 1], clamp));
  // fade-out of item i = fade-in of item i+1, so text layers swap cleanly instead of overlapping
  const textAlpha = (i: number) => {
    const next = i + 1 < seg.items.length && frame >= starts[i + 1] ? alpha(i + 1) : 0;
    return Math.min(alpha(i), 1 - next);
  };

  const imageLayer = (item: MontageItem, i: number) => {
    const local = frame - starts[i];
    const displayH = (width * item.height) / item.width;
    let style: React.CSSProperties;
    if (item.pan && displayH > height + 2) {
      const hold = Math.round(0.45 * fps);
      const y = interpolate(local, [hold, durs[i] - hold], [0, -(displayH - height)], { ...clamp, easing: ease });
      style = { position: "absolute", left: 0, top: y, width, height: displayH };
    } else {
      const scale = interpolate(local, [0, durs[i]], [1, 1.03], clamp);
      style = { position: "absolute", inset: 0, width, height, objectFit: "cover", transform: `scale(${scale})` };
    }
    return (
      <AbsoluteFill key={`img-${i}`} style={{ opacity: alpha(i), overflow: "hidden" }}>
        <Img src={staticFile(item.image)} style={{ ...style, filter: theme.grade.filter }} />
      </AbsoluteFill>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, overflow: "hidden" }}>
      {visible.map((i) => imageLayer(seg.items[i], i))}

      {visible.map((i) => {
        const item = seg.items[i];
        if (!item.chapter && !item.chapterEn) return null;
        const local = frame - starts[i];
        const inA = interpolate(local, [overlap * 0.4, overlap * 0.4 + 0.4 * fps], [0, 1], { ...clamp, easing: ease });
        const a = Math.min(inA, textAlpha(i));
        const lift = interpolate(inA, [0, 1], [16, 0]);
        return (
          <AbsoluteFill key={`ch-${i}`} style={{ opacity: a }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.35) 22%, transparent 38%)" }} />
            <div style={{ position: "absolute", left: 64, right: 64, top: 120, maxWidth: 952, color: "#fff", textShadow: "0 2px 14px rgba(0,0,0,0.45)", translate: `0px ${lift}px`, ...({ textWrap: "balance" } as React.CSSProperties) }}>
              {item.chapterKicker ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: theme.fonts.latin, fontSize: 28, letterSpacing: 8, fontWeight: 600, opacity: 0.9 }}>
                  <div style={{ width: 48, height: 2, backgroundColor: "#fff" }} />
                  {item.chapterKicker}
                </div>
              ) : null}
              {item.chapterEn ? (
                <div style={{ fontFamily: script, fontStyle: script === bodoni ? "italic" : "normal", fontSize: script === pinyon ? 170 : 130, lineHeight: 1.15, marginTop: item.chapterKicker ? theme.space.s : 0, maxWidth: 952, ...({ textWrap: "balance" } as React.CSSProperties) }}>
                  {item.chapterEn}
                </div>
              ) : null}
              {item.chapter ? (
                <div style={{ fontFamily: theme.fonts.zh, fontWeight: 900, fontSize: 64, lineHeight: 1.2, letterSpacing: 6, marginTop: item.chapterEn ? theme.space.s : 0, maxWidth: 952, ...({ textWrap: "balance" } as React.CSSProperties) }}>{item.chapter}</div>
              ) : null}
            </div>
          </AbsoluteFill>
        );
      })}

      {visible.map((i) => {
        const item = seg.items[i];
        if (!item.label) return null;
        const [zh, en] = item.label.split(" · ");
        return (
          <div
            key={`lb-${i}`}
            style={{
              position: "absolute",
              left: 64,
              right: 64,
              maxWidth: 952,
              bottom: 150,
              color: "#fff",
              opacity: textAlpha(i),
              textShadow: "0 2px 10px rgba(0,0,0,0.75)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              columnGap: theme.space.s,
              rowGap: theme.space.s,
              ...({ textWrap: "balance" } as React.CSSProperties),
            }}
          >
            <span style={{ fontFamily: theme.fonts.zh, fontSize: 36, letterSpacing: 2 }}>{zh}</span>
            {en ? <span style={{ fontFamily: theme.fonts.latin, fontStyle: "italic", fontSize: 32, opacity: 0.85 }}>{en}</span> : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
