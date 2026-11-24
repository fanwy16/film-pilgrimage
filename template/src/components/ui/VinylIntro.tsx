import React from "react";
import { Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { FilmTheme } from "../../theme";

/*
 * Before Sunrise opening: a record on the cover. A pointer glides in and clicks it, the record spins up
 * to 33⅓ rpm, the tonearm swings onto it, the needle drops (crackle) and the song starts (see the
 * `delaySec` on the music cue, which equals NEEDLE_SEC).
 * The label is our own design (song title), not the shop's logo.
 */
export const CLICK_SEC = 1.3;
export const NEEDLE_SEC = CLICK_SEC + 0.55;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.65, 0, 0.35, 1);

export const VinylIntro: React.FC<{ theme: FilmTheme; cx: number; cy: number; r: number }> = ({ theme, cx, cy, r }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;

  // spin: 0 until the click, then ease up to 33⅓ rpm over ~0.8s; angle = integral of speed
  const rps = 100 / 3 / 60;
  const t0 = CLICK_SEC;
  const ramp = 0.8;
  const angle =
    sec < t0 ? 0 : sec < t0 + ramp ? 360 * rps * ((sec - t0) ** 2 / (2 * ramp)) : 360 * rps * (ramp / 2 + (sec - t0 - ramp));

  // tonearm swings from rest onto the record
  const arm = interpolate(sec, [CLICK_SEC + 0.1, NEEDLE_SEC], [0, 1], { ...clamp, easing: ease });

  // pointer: glides in from bottom right, presses, then drifts off
  const inP = interpolate(sec, [0.35, CLICK_SEC - 0.05], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.7, 0.3, 1) });
  const outP = interpolate(sec, [CLICK_SEC + 0.45, CLICK_SEC + 1.0], [0, 1], { ...clamp, easing: ease });
  const target = { x: cx + r * 0.12, y: cy + r * 0.18 };
  const px = interpolate(inP, [0, 1], [cx + r * 1.6, target.x]) + outP * r * 0.9;
  const py = interpolate(inP, [0, 1], [cy + r * 2.4, target.y]) + outP * r * 1.3;
  const press = interpolate(sec, [CLICK_SEC - 0.05, CLICK_SEC, CLICK_SEC + 0.12], [1, 0.82, 1], clamp);
  const pointerA = Math.min(interpolate(sec, [0.35, 0.5], [0, 1], clamp), 1 - outP);
  const ripple = interpolate(sec, [CLICK_SEC, CLICK_SEC + 0.5], [0, 1], clamp);

  const grooves = Array.from({ length: 14 }, (_, k) => r * (0.42 + (k * 0.52) / 14));
  const labelR = r * 0.34;
  const accent = "#c8553d";

  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <defs>
          <radialGradient id="vinyl-sheen" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.26)" />
            <stop offset="35%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <path id="label-arc" d={`M ${cx - labelR * 0.72} ${cy} A ${labelR * 0.72} ${labelR * 0.72} 0 0 1 ${cx + labelR * 0.72} ${cy}`} />
        </defs>
        {/* shadow + disc */}
        <circle cx={cx + 6} cy={cy + 10} r={r} fill="rgba(0,0,0,0.45)" />
        <g transform={`rotate(${angle} ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={r} fill="#0d0d0f" stroke="rgba(255,255,255,0.28)" strokeWidth={2} />
          {grooves.map((gr, k) => (
            <circle key={k} cx={cx} cy={cy} r={gr} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1.2} />
          ))}
          <circle cx={cx} cy={cy} r={labelR} fill={accent} />
          <circle cx={cx} cy={cy} r={labelR - 6} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
          <text fontFamily={theme.fonts.latin} fontSize={labelR * 0.3} fill="#fff" letterSpacing={2}>
            <textPath href="#label-arc" startOffset="50%" textAnchor="middle">
              COME HERE
            </textPath>
          </text>
          <text x={cx} y={cy + labelR * 0.55} textAnchor="middle" fontFamily={theme.fonts.latin} fontStyle="italic" fontSize={labelR * 0.22} fill="rgba(255,255,255,0.85)">
            Kath Bloom · Side A
          </text>
          <circle cx={cx} cy={cy} r={5} fill="#e9e4da" />
        </g>
        {/* fixed highlight: stays put while the disc turns, which is what makes it read as spinning */}
        <circle cx={cx} cy={cy} r={r} fill="url(#vinyl-sheen)" />
        {/* tonearm */}
        <g transform={`rotate(${-28 + 28 * arm} ${cx + r * 0.95} ${cy - r * 0.95})`}>
          <circle cx={cx + r * 0.95} cy={cy - r * 0.95} r={16} fill="#b9b3a7" stroke="#57524a" strokeWidth={2} />
          <line x1={cx + r * 0.95} y1={cy - r * 0.95} x2={cx + r * 0.55} y2={cy + r * 0.25} stroke="#cfc9bd" strokeWidth={7} strokeLinecap="round" />
          <rect x={cx + r * 0.47} y={cy + r * 0.2} width={26} height={16} rx={3} fill="#8e887d" transform={`rotate(-20 ${cx + r * 0.55} ${cy + r * 0.25})`} />
        </g>
        {/* click ripple */}
        {ripple > 0 && ripple < 1 ? (
          <circle cx={target.x} cy={target.y} r={10 + ripple * 60} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={3 * (1 - ripple)} opacity={1 - ripple} />
        ) : null}
        {/* pointer (classic arrow) */}
        <g transform={`translate(${px} ${py}) scale(${1.6 * press})`} opacity={pointerA}>
          <path d="M0 0 L0 24 L6.5 18.5 L10.5 27.5 L14 26 L10 17 L18 17 Z" fill="#fff" stroke="#111" strokeWidth={1.5} strokeLinejoin="round" />
        </g>
      </svg>
      <Sequence from={Math.round(CLICK_SEC * fps) - 1} layout="none" name="click">
        <Audio src={staticFile("sfx/click.wav")} volume={0.45} />
      </Sequence>
      {/* needle drop + surface crackle under the first seconds of the song */}
      <Sequence from={Math.round(NEEDLE_SEC * fps) - 2} layout="none" name="needle">
        <Audio src={staticFile("sfx/needle.wav")} volume={0.6} />
      </Sequence>
    </>
  );
};
