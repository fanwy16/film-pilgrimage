import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, Series, useCurrentFrame, useVideoConfig } from "remotion";
import { Segment, walkFrames } from "../../lib/timeline";
import { FilmTheme } from "../../theme";
import { FilmData, Shot } from "../../types";
import { Caption, Header } from "../ui/Caption";
import { GradedImage } from "../ui/GradedImage";
import { MiniMap, walkMinutes } from "../map/MiniMap";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Image frame occupies the center band above the persistent mini-map. */
export const shotLayout = (shot: Shot, frameW: number, maxH = 1198, top = 330) => {
  let w = frameW;
  let h = (frameW * shot.height) / shot.width;
  if (h > maxH) {
    h = maxH;
    w = (maxH * shot.width) / shot.height;
  }
  return { w, h, left: (frameW - w) / 2, top };
};

export const ShotView: React.FC<{ shot: Shot; theme: FilmTheme }> = ({ shot, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = theme.timing;
  const transition = shot.transition ?? (theme.skin === "scroll" ? "scroll" : "dissolve");
  const filmstrip = theme.skin === "filmstrip";
  // Content column is x 40–1040 (same as the map). The film strip's sprockets (76px each side) sit
  // inside that column, so the picture itself is 1000 - 152 wide there.
  // Film-strip look: the strip starts at the left margin (sprockets at x 40–116) and deliberately runs off
  // the right edge of the screen, like a strip passing through the frame. Other skins stay inside x 40–1040.
  // film strip as in the first version: left sprockets at x 76–152, picture 152–1080, right sprockets off screen
  const frameWidth = filmstrip ? 1080 - 152 : 1000;
  const CAPTION_BOTTOM = 362; // caption block ends ~345
  const MAP_SMALL_TOP = 1460; // small map starts here (see MiniMap)
  const MAP_BIG_TOP = 900;
  const gap = 12;
  const availableH = MAP_SMALL_TOP - 20 - CAPTION_BOTTOM;
  const topH = Math.min((frameWidth * (shot.splitRatio ?? 0.5) * shot.height) / shot.width, (availableH - gap) / 2, MAP_BIG_TOP - 16 - CAPTION_BOTTOM);
  const w = Math.min(frameWidth, (topH * shot.width) / (shot.height * (shot.splitRatio ?? 0.5)));
  const h = (w * shot.height) / shot.width;
  const left = filmstrip ? 152 : 40 + (1000 - w) / 2;
  // centre the final pair between the caption and the small map, but keep the film-only frame clear of the big map
  const pairH = topH * 2 + gap;
  const pairTop = Math.min(CAPTION_BOTTOM + (availableH - pairH) / 2, MAP_BIG_TOP - 16 - topH);
  const revealStart = t.filmRevealSec * fps;
  const revealEnd = revealStart + t.wipeSec * fps;
  const splitStart = revealEnd + t.overlayHoldSec * fps;
  const splitEnd = splitStart + t.splitSec * fps;
  const revealEase = transition === "scroll" ? Easing.bezier(0.65, 0, 0.35, 1) : Easing.bezier(0.4, 0, 0.2, 1);
  const reveal = interpolate(frame, [revealStart, revealEnd], [0, 1], { ...clamp, easing: revealEase });
  const splitProgress = interpolate(frame, [splitStart, splitEnd], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const filmY = pairTop;
  const realY = interpolate(splitProgress, [0, 1], [pairTop, pairTop + topH + gap]);
  const rollerOpacity = interpolate(frame, [revealEnd - t.wipeSec * fps * 0.15, revealEnd], [1, 0], clamp);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left, top: filmY, width: w, height: topH, overflow: "visible", border: theme.skin === "scroll" ? "10px solid #fbf6ec" : undefined, boxShadow: theme.skin === "scroll" ? "0 6px 18px rgba(60,40,20,0.25)" : undefined }}>
        {filmstrip ? <FilmstripSprockets top={filmY} height={topH + 12} theme={theme} /> : null}
        {/* Clip to the film half: the merged image is twice as tall as this frame. */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <GradedImage src={shot.image} width={w} height={h} theme={theme} />
        </div>
      </div>
      <div style={{ position: "absolute", left, top: realY, width: w, height: topH, overflow: "visible", border: theme.skin === "scroll" ? "10px solid #fbf6ec" : undefined, boxShadow: theme.skin === "scroll" ? "0 6px 18px rgba(60,40,20,0.25)" : undefined }}>
        {filmstrip ? <FilmstripSprockets top={realY} height={topH + 12} theme={theme} /> : null}
        {transition === "scroll" ? (
          <>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: `inset(0 ${100 - reveal * 100}% 0 0)` }}>
              <GradedImage src={shot.image} width={w} height={h} theme={theme} style={{ top: -topH }} />
            </div>
            {frame >= revealStart && frame < revealEnd ? <div style={{ position: "absolute", left: reveal * w - 8, top: -10, width: 16, height: topH + 20, opacity: rollerOpacity, background: "linear-gradient(90deg, #8a5a2b, #c89b6d, #6b4220)", boxShadow: "0 3px 8px rgba(0,0,0,.45)" }} /> : null}
          </>
        ) : (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: reveal }}><GradedImage src={shot.image} width={w} height={h} theme={theme} style={{ top: -topH }} /></div>
        )}
        {filmstrip ? <div style={{position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(ellipse at ${reveal*100}% 50%, rgba(255,150,70,${Math.sin(Math.PI*reveal)*0.45}), transparent 60%)`, mixBlendMode:"screen"}}/> : null}
      </div>
    </AbsoluteFill>
  );
};

const FilmstripSprockets: React.FC<{top:number;height:number;theme:FilmTheme}> = ({top,height,theme}) => <>
  {[0,1].map((side) => <div key={side} style={{position:"absolute",left:side===0?-76:undefined,right:side===1?-76:undefined,top:-6,width:76,height,background:"#0b0b0b",zIndex:-1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-around"}}>{Array.from({length:Math.ceil(height/48)},(_,i)=><div key={i} style={{width:20,height:28,borderRadius:4,background:theme.colors.bg}}/>)}</div>)}
</>;

/**
 * Behind the walk card: the stop's film still, filling the area above the map and fading into paper,
 * so the card isn't floating on a blank page and previews the scene we're walking to.
 */
const WalkBackdrop: React.FC<{ shot: Shot; theme: FilmTheme; opacity: number }> = ({ shot, theme, opacity }) => {
  const areaH = 880;
  const halfH = (shot.height * (shot.splitRatio ?? 0.5));
  const scale = Math.max(1080 / shot.width, areaH / halfH);
  const w = shot.width * scale;
  const paper = theme.colors.bg;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: areaH, overflow: "hidden", opacity }}>
      <GradedImage src={shot.image} width={w} height={shot.height * scale} theme={theme} style={{ left: (1080 - w) / 2, top: (areaH - halfH * scale) / 2 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, ${paper}f0 0%, ${paper}d9 38%, ${paper}66 75%, ${paper}33 100%), linear-gradient(180deg, transparent 70%, ${paper} 100%)`,
        }}
      />
    </div>
  );
};

export const LocationSegment: React.FC<{
  seg: Extract<Segment, { kind: "location" }>;
  film: FilmData;
  theme: FilmTheme;
  days: number[] | null;
}> = ({ seg, film, theme, days }) => {
  const frame = useCurrentFrame();
  const loc = seg.location;
  const W = walkFrames(theme);
  const newDay = !seg.previousLocation || seg.previousLocation.day !== loc.day;
  const from = newDay ? film.start : seg.previousLocation!;
  const cardOut = interpolate(frame, [W - 8, W], [1, 0], clamp);
  const photosIn = interpolate(frame, [W - 8, W], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {theme.skin === "scroll" ? <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.06,pointerEvents:"none"}}><filter id="paper-noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/></filter><rect width="100%" height="100%" filter="url(#paper-noise)"/></svg> : null}
      {/* Walk card: where we're heading, shown while the dot walks on the big map */}
      {frame < W ? <WalkBackdrop shot={loc.shots[0]} theme={theme} opacity={cardOut} /> : null}
      {frame < W ? (
        <div style={{ position: "absolute", left: 40, top: 300, width: 1000, maxWidth: 1000, opacity: cardOut, color: theme.colors.ink, zIndex: 2 }}>
          <div style={{ fontFamily: theme.fonts.zh, fontSize: 40, lineHeight: 1.2, color: theme.colors.muted, letterSpacing: 6 }}>{newDay ? `${film.showDay && loc.day !== null ? `DAY ${loc.day} · ` : ""}第一站` : "下一站"}</div>
          <div style={{ fontFamily: theme.fonts.zh, fontWeight: 900, fontSize: 96, lineHeight: 1.15, marginTop: theme.space.s, ...({ textWrap: "balance" } as React.CSSProperties) }}>{loc.placeZh}</div>
          <div style={{ fontFamily: theme.fonts.latin, fontStyle: "italic", fontSize: 44, lineHeight: 1.2, color: theme.colors.muted, marginTop: theme.space.s, maxWidth: 1000, ...({ textWrap: "balance" } as React.CSSProperties) }}>{loc.place}</div>
          <div style={{ fontFamily: theme.fonts.zh, fontSize: 36, lineHeight: 1.2, color: theme.colors.accent, marginTop: theme.space.m, maxWidth: 1000, ...({ textWrap: "balance" } as React.CSSProperties) }}>
            {loc.walkNoteZh ??
              (walkMinutes(from, loc) > 25
                ? `从${from === film.start ? film.start.nameZh : seg.previousLocation!.placeZh}出发` // too far to call it a walk
                : `从${newDay ? film.start.nameZh : seg.previousLocation!.placeZh}${newDay ? "出发 · " : ""}步行约 ${walkMinutes(from, loc)} 分钟`)}
          </div>
          {loc.tipZh ? (
            <div style={{ display: "flex", alignItems: "center", gap: theme.space.s, marginTop: theme.space.m, fontFamily: theme.fonts.zh, fontSize: 32, lineHeight: 1.2, color: theme.colors.ink, maxWidth: 1000, ...({ textWrap: "balance" } as React.CSSProperties) }}>
              <span style={{ fontFamily: theme.fonts.latin, fontSize: 24, letterSpacing: 4, fontWeight: 600, padding: "4px 12px", border: `1.5px solid ${theme.colors.accent}`, color: theme.colors.accent }}>TIP</span>
              {loc.tipZh}
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{ position: "absolute", inset: "0 0 auto 0", height: 1440, overflow: "hidden", zIndex: 1, opacity: photosIn }}>
        <Sequence from={W - 8} layout="none">
          <Sequence from={8} layout="none">
            <Series>
              {loc.shots.map((shot, i) => (
                <Series.Sequence key={`${shot.image}-${i}`} durationInFrames={seg.shotFrames[i]} name={`${loc.id} · shot ${i + 1}`}>
                  <ShotView shot={shot} theme={theme} />
                </Series.Sequence>
              ))}
            </Series>
          </Sequence>
        </Sequence>
      </div>
      <MiniMap
        film={film}
        location={loc}
        previousLocation={seg.previousLocation}
        walkFrames={W}
        shotFrames={seg.shotFrames}
        theme={theme}
        top={900}
        options={{ days }}
      />
      <Header day={loc.day} index={seg.index} total={seg.total} theme={theme} showDay={film.showDay} />
      <Sequence from={W} layout="none" name="Captions">
        <Series>
          {loc.shots.map((shot, i) => {
            const same = i > 0 && (shot.scene ?? loc.scene) === (loc.shots[i - 1].scene ?? loc.scene);
            if (same) return null;
            let len = seg.shotFrames[i];
            for (let j = i + 1; j < loc.shots.length && (loc.shots[j].scene ?? loc.scene) === (shot.scene ?? loc.scene); j++) {
              len += seg.shotFrames[j];
            }
            return (
              <Series.Sequence key={`cap-${i}`} durationInFrames={len} name="Caption">
                <Caption location={loc} film={film} theme={theme} scene={shot.scene ?? loc.scene} />
              </Series.Sequence>
            );
          })}
        </Series>
      </Sequence>
    </AbsoluteFill>
  );
};
