import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

/** Animated film grain. Seed changes every frame so the noise flickers like film. */
export const FilmGrain: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  if (opacity <= 0) return null;
  const seed = frame % 24;
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};
