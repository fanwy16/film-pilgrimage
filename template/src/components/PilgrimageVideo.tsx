import React, { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import "../fonts";
import { FILMS } from "../data";
import { buildTimeline, Segment } from "../lib/timeline";
import { THEMES } from "../theme";
import { FilmData, FilmId } from "../types";
import { FilmTheme } from "../theme";
import { LocationSegment } from "./segments/LocationSegment";
import { MapSegment } from "./segments/MapSegment";
import { EasterEgg } from "./segments/EasterEgg";
import { EndingMontage } from "./segments/EndingMontage";
import { RouteCard } from "./segments/RouteCard";
import { Finale } from "./segments/Finale";
import { TitleCard } from "./segments/TitleCard";
import { FilmGrain } from "./ui/FilmGrain";
import { Music } from "./Music";

export type PilgrimageProps = {
  filmId: FilmId;
  /** Only these trip days; null = all. */
  days: number[] | null;
};

const renderSegment = (seg: Segment, film: FilmData, theme: FilmTheme, days: number[] | null) => {
  switch (seg.kind) {
    case "title":
      return <TitleCard film={film} theme={theme} />;
    case "start":
      return <StartCard seg={seg} theme={theme} />;
    case "map":
      return <MapSegment seg={seg} film={film} theme={theme} />;
    case "location":
      return <LocationSegment seg={seg} film={film} theme={theme} days={days} />;
    case "montage":
      return <EndingMontage seg={seg} theme={theme} />;
    case "finale":
      return <Finale film={film} theme={theme} />;
    case "routeCard":
      return <RouteCard film={film} theme={theme} days={days} />;
    case "easterEgg":
      return <EasterEgg seg={seg} film={film} theme={theme} />;
  }
};

const segName = (seg: Segment) =>
  seg.kind === "location" ? `📍 ${seg.location.placeZh}` : seg.kind === "map" ? `🗺 ${seg.title}` : seg.kind;

export const PilgrimageVideo: React.FC<PilgrimageProps> = ({ filmId, days }) => {
  const film = FILMS[filmId];
  const theme = THEMES[filmId];
  const segments = useMemo(() => buildTimeline(film, theme, { days }), [film, theme, days]);

  return (
    // text-wrap: pretty keeps wrapped lines from ending with an orphan of one or two characters
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, fontVariantNumeric: "lining-nums", ...({ textWrap: "pretty" } as React.CSSProperties) }}>
      {/* black under everything: segment dips and the final fade go to black */}
      <AbsoluteFill style={{ backgroundColor: "#000" }} />
      <Series>
        {segments.map((seg, i) => {
          const prev = segments[i - 1];
          const next = segments[i + 1];
          // a short dip between segments that do different jobs; same-kind neighbours (check-in → check-in)
          // already flow into each other, and the finale → hostel pair has its own dip
          const own = (a?: Segment, b?: Segment) => a?.kind === "finale" && b?.kind === "start";
          const fadeIn = !!prev && prev.kind !== seg.kind && !own(prev, seg) ? DIP : 0;
          const fadeOut = !next ? END_FADE : next.kind !== seg.kind && !own(seg, next) ? DIP : 0;
          return (
            <Series.Sequence key={i} durationInFrames={seg.frames} name={segName(seg)}>
              <SegmentFade frames={seg.frames} fadeIn={fadeIn} fadeOut={fadeOut}>
                {renderSegment(seg, film, theme, days)}
              </SegmentFade>
            </Series.Sequence>
          );
        })}
      </Series>
      <FilmGrain opacity={theme.grade.grain} />
      {film.music ? <Music cues={film.music} segments={segments} /> : null}
    </AbsoluteFill>
  );
};

const DIP = 7; // frames down + 7 frames up ≈ 0.45s
const END_FADE = 24; // the last 0.8s fades to black

const SegmentFade: React.FC<{ frames: number; fadeIn: number; fadeOut: number; children: React.ReactNode }> = ({ frames, fadeIn, fadeOut, children }) => {
  const frame = useCurrentFrame();
  const a = Math.min(
    fadeIn ? interpolate(frame, [0, fadeIn], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1,
    fadeOut ? interpolate(frame, [frames - fadeOut, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1,
  );
  return <AbsoluteFill style={{ opacity: a }}>{children}</AbsoluteFill>;
};

const StartCard: React.FC<{seg: Extract<Segment, {kind:"start"}>; theme: FilmTheme}> = ({seg,theme}) => {
 const frame=useCurrentFrame(); const scale=interpolate(frame,[0,75],[1,1.02],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
 // at the end of the video it follows the finale's dip to dark, so it fades in from dark
 const fadeIn = seg.at === "end" ? interpolate(frame,[0,12],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}) : 1;
 return <AbsoluteFill style={{overflow:"hidden",color:"white",backgroundColor:"#111"}}><AbsoluteFill style={{opacity:fadeIn}}><Img src={staticFile(seg.image)} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",transform:`scale(${scale})`}}/><div style={{position:"absolute",inset:"48% 0 0",background:"linear-gradient(transparent,rgba(0,0,0,.78))"}}/><div style={{position:"absolute",left:64,right:64,bottom:112,maxWidth:952}}><div style={{fontFamily:theme.fonts.zh,fontSize:64,lineHeight:1.2,...({textWrap:"balance"} as React.CSSProperties)}}>{seg.captionZh}</div>{seg.noteZh ? <div style={{fontFamily:theme.fonts.zh,fontSize:36,lineHeight:1.2,opacity:.9,marginTop:theme.space.s,...({textWrap:"balance"} as React.CSSProperties)}}>{seg.noteZh}</div> : null}</div></AbsoluteFill></AbsoluteFill>;
};
