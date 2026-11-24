import { FilmData, FilmId } from "../types";
import beforeSunrise from "./before-sunrise.json";

// Register each film here. before-sunrise is a working example (photos in public/raw/, no music);
// keep it for reference or remove it and its images. Structure-only example: ../../examples/sound-of-music.json

export const FILMS: Record<FilmId, FilmData> = {
  "before-sunrise": beforeSunrise as unknown as FilmData,
};
