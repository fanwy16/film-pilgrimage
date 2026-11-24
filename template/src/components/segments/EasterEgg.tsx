import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Segment } from "../../lib/timeline";
import { FilmTheme } from "../../theme";
import { FilmData } from "../../types";
import { FilmGrain } from "../ui/FilmGrain";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const Fell = '"IM Fell English", Georgia, serif';

export const EasterEgg: React.FC<{ seg: Extract<Segment, { kind: "easterEgg" }>; film: FilmData; theme: FilmTheme }> = ({ film, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const egg = film.easterEgg;
  if (!egg) return <AbsoluteFill style={{ background: "#0e0b08" }} />;
  const sec = frame / fps;
  const restore = Math.min(1, Math.max(0, (sec - 5.4) / 1.0)); // 5.4–6.4s: film still regains colour as the pair separates
  const countdown = sec < 1.6;
  const title = sec >= 1.6 && sec < 3;
  const irisIn = interpolate(frame, [3 * fps, 3.8 * fps], [0, 75], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const reveal = interpolate(frame, [3.8 * fps, 5.4 * fps], [0, 1], clamp);
  const split = interpolate(frame, [5.4 * fps, 6.2 * fps], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const irisOut = interpolate(frame, [8.4 * fps, 9.2 * fps], [75, 0], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const radius = sec < 3 ? 0 : sec < 3.8 ? irisIn : sec < 8.4 ? 75 : irisOut;
  const filmY = 300;
  const photoY = 300 + 564 + 12 * split;
  const flicker = 0.93 + 0.1 * random(`f-${frame}`);
  const scratches = sec > 1.6 ? Math.floor(random(`s-${Math.floor(frame / 4)}-n`) * 3) : 0;
  const opacity = title ? interpolate(frame, [1.6 * fps, 1.75 * fps, 2.8 * fps, 3 * fps], [0, 1, 1, 0], clamp) : 1;
  const panelClip = `circle(${radius}% at 50% 50%)`;
  return <AbsoluteFill style={{ background: "#0e0b08", filter: `brightness(${flicker})` }}>
    <Audio src={staticFile("sfx/projector.wav")} volume={0.55} />
    {countdown ? <AbsoluteFill style={{alignItems:"center",justifyContent:"center",background:"#cbb48a",color:"#3a2c1c"}}>
      <div style={{position:"absolute",width:700,height:700,border:"3px solid #3a2c1c",borderRadius:"50%",background:`conic-gradient(rgba(58,44,28,.22) ${(frame%(Math.round(.53*fps)))/(Math.round(.53*fps))*360}deg, transparent 0)`}}/>
      <div style={{position:"absolute",width:650,height:650,border:"2px solid #3a2c1c",borderRadius:"50%"}}/>
      <div style={{position:"absolute",width:700,height:2,background:"#3a2c1c"}}/><div style={{position:"absolute",height:700,width:2,background:"#3a2c1c"}}/>
      <div style={{fontFamily:Fell,fontSize:320,zIndex:1}}>{3-Math.min(2,Math.floor(sec/.53))}</div>
    </AbsoluteFill> : null}
    {title ? <AbsoluteFill style={{alignItems:"center",justifyContent:"center",opacity}}><div style={{width:900,height:600,border:"3px double #d9c39a",outline:"1px solid #d9c39a",outlineOffset:-14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:theme.space.s,color:"#f3e6c8",position:"relative",padding:theme.space.xl,boxSizing:"border-box",maxWidth:1000}}><span style={{fontFamily:"Songti SC",fontSize:36,color:"#d9c39a"}}>✦　彩蛋　✦</span><div style={{fontFamily:"Songti SC",fontSize:80,lineHeight:1.2,...({textWrap:"balance"} as React.CSSProperties)}}>另一个维也纳</div><div style={{fontFamily:Fell,fontStyle:"italic",fontSize:48,lineHeight:1.2,...({textWrap:"balance"} as React.CSSProperties)}}>Sissi · 1955</div></div></AbsoluteFill>:null}
    {sec>=3 ? <div style={{position:"absolute",left:40,top:filmY,width:1000,height:564,overflow:"hidden",clipPath:panelClip,border:"6px solid #f3e6c8",boxSizing:"border-box"}}><Img src={staticFile(egg.image)} style={{position:"absolute",width:1000,height:1128,top:0,filter:`sepia(${.5*(1-restore)}) saturate(${.7+.3*restore}) contrast(${1.05-.05*restore})`}}/></div>:null}
    {sec>=3.8 ? <div style={{position:"absolute",left:40,top:photoY,width:1000,height:564,overflow:"hidden",clipPath:panelClip,border:"6px solid #f3e6c8",boxSizing:"border-box",opacity:reveal}}><Img src={staticFile(egg.image)} style={{position:"absolute",width:1000,height:1128,top:-564,filter:`sepia(${.7*(1-reveal)}) saturate(${.5+.5*reveal})`}}/></div>:null}
    {sec>=6.2 && sec<8.4 ? <div style={{position:"absolute",left:40,right:40,top:1470,textAlign:"center",color:"#f3e6c8",fontFamily:"Songti SC",fontSize:40,lineHeight:1.2,letterSpacing:2,maxWidth:1000,...({textWrap:"balance"} as React.CSSProperties)}}>美泉宫 · 凯旋门 Gloriette<div style={{fontFamily:Fell,fontSize:32,lineHeight:1.2,color:"#d9c39a",marginTop:theme.space.s}}>1955 → 2026</div></div>:null}
    {sec>=1.6 && sec<3 ? <div style={{position:"absolute",inset:0,borderTop:"1px solid #d9c39a",borderBottom:"1px solid #d9c39a",pointerEvents:"none"}}/>:null}
    <OldFilmOverlay frame={frame} scratches={scratches}/><div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.65) 100%)"}}/><FilmGrain opacity={0.28}/>
  </AbsoluteFill>;
};

const OldFilmOverlay: React.FC<{frame:number;scratches:number}> = ({frame,scratches}) => <AbsoluteFill style={{pointerEvents:"none"}}>{Array.from({length:6},(_,i)=>{const x=random(`d-${frame}-${i}`)*1080;const y=random(`dy-${frame}-${i}`)*1920;const size=2+random(`ds-${frame}-${i}`)*4;return <div key={i} style={{position:"absolute",left:x,top:y,width:size,height:size,borderRadius:"50%",background:"#f3e6c8",opacity:.2+random(`do-${frame}-${i}`)*.4}}/>})}{Array.from({length:scratches},(_,i)=><div key={`s${i}`} style={{position:"absolute",left:random(`s-${Math.floor(frame/4)}-${i}`)*1080,top:0,width:1+random(`sw-${i}-${Math.floor(frame/4)}`),height:"100%",background:"rgba(255,240,210,.25)"}}/>)}</AbsoluteFill>;
