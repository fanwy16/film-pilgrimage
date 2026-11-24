import React from "react";
import { CalculateMetadataFunction, Composition } from "remotion";
import { Cover, COVER_SIZE } from "./components/Cover";
import { PilgrimageProps, PilgrimageVideo } from "./components/PilgrimageVideo";
import { FILMS } from "./data";
import { buildTimeline, totalFrames } from "./lib/timeline";
import { THEMES, VIDEO } from "./theme";

const calculateMetadata: CalculateMetadataFunction<PilgrimageProps> = ({ props }) => ({
  durationInFrames: totalFrames(buildTimeline(FILMS[props.filmId], THEMES[props.filmId], { days: props.days })),
});

const common = { fps: VIDEO.fps, width: VIDEO.width, height: VIDEO.height, durationInFrames: 1, calculateMetadata };

/** "before-sunrise" → "BeforeSunrise" */
const pascal = (id: string) => id.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase());

/**
 * One video per film in src/data/index.ts, plus one per day when the trip has several days
 * (e.g. SoundOfMusicDay1), plus the 3:4 小红书 feed cover (`npx remotion still Cover-<film>`).
 */
export const RemotionRoot: React.FC = () => (
  <>
    {Object.keys(FILMS).map((filmId) => {
      const id = pascal(filmId);
      const days = FILMS[filmId].days.map((d) => d.day);
      return (
        <React.Fragment key={filmId}>
          <Composition id={id} component={PilgrimageVideo} defaultProps={{ filmId, days: null }} {...common} />
          {days.length > 1
            ? days.map((d) => <Composition key={d} id={`${id}Day${d}`} component={PilgrimageVideo} defaultProps={{ filmId, days: [d] }} {...common} />)
            : null}
          <Composition id={`Cover-${filmId}`} component={Cover} defaultProps={{ filmId }} fps={VIDEO.fps} durationInFrames={1} {...COVER_SIZE} />
        </React.Fragment>
      );
    })}
  </>
);
