import React from "react";
import { interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Segment } from "../lib/timeline";
import { MusicCue } from "../types";

/** Frame where a boundary sits: "start", "end", or the first segment of that kind. */
const boundary = (name: string, segments: Segment[], total: number) => {
  if (name === "start") return 0;
  if (name === "end") return total;
  let at = 0;
  for (const s of segments) {
    if (s.kind === name) return at;
    at += s.frames;
  }
  return total; // kind not in this cut: treat as the end
};

export const Music: React.FC<{ cues: MusicCue[]; segments: Segment[] }> = ({ cues, segments }) => {
  const { fps, durationInFrames: total } = useVideoConfig();
  return (
    <>
      {cues.map((cue, i) => {
        const from = boundary(cue.from, segments, total) + Math.round((cue.delaySec ?? 0) * fps);
        const to = boundary(cue.to, segments, total);
        const len = Math.min(total - from, to - from + Math.round((cue.tailSec ?? 0) * fps));
        if (len <= 0) return null;
        // the song moment that lands on the aligned boundary
        const songAtFrom = cue.alignAt === "from" ? cue.alignSongSec : cue.alignSongSec - (to - from) / fps;
        const trimBefore = Math.max(0, Math.round(songAtFrom * fps));
        const lead = Math.max(0, Math.round(-songAtFrom * fps)); // song shorter than the span: start later
        const fadeIn = Math.max(1, Math.round((cue.fadeInSec ?? 0.3) * fps));
        const fadeOut = Math.max(1, Math.round((cue.fadeOutSec ?? 0.5) * fps));
        const playLen = len - lead;
        const vol = cue.volume ?? 0.9;
        const duckAt = cue.duckFrom ? boundary(cue.duckFrom, segments, total) - from - lead : Infinity;
        const duck = (f: number) =>
          Number.isFinite(duckAt) ? interpolate(f, [duckAt - Math.round(0.6 * fps), duckAt], [1, (cue.duckVolume ?? 0.3) / vol], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
        return (
          <Sequence key={i} from={from + lead} durationInFrames={playLen} name={`♪ ${cue.src}`} layout="none">
            <Audio
              src={staticFile(cue.src)}
              trimBefore={trimBefore}
              volume={(f) => vol * duck(f) * Math.min(interpolate(f, [0, fadeIn], [0, 1], { extrapolateRight: "clamp" }), interpolate(f, [playLen - fadeOut, playLen], [1, 0], { extrapolateLeft: "clamp" }))}
            />
          </Sequence>
        );
      })}
    </>
  );
};
