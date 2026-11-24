/** Film slug, e.g. "before-sunrise". Must match a key in src/data/index.ts and src/theme.ts. */
export type FilmId = string;

export type LatLng = { lat: number; lng: number };

/** One merged image: film still on top, real photo below. */
export type Shot = {
  image: string; // path relative to public/
  width: number;
  height: number;
  /** Where the film still ends, 0–1 of image height. Default 0.5. */
  splitRatio?: number;
  /** Overrides the location's scene label for this shot. */
  scene?: string;
  /** match = film still and photo frame nearly identical (overlay them); loose = different angle/scale. */
  align?: "match" | "loose";
  transition?: "scroll" | "dissolve";
  /** Where the real photo was taken from. heading: degrees clockwise from north, null = unknown. */
  camera?: ShotCamera;
};

export type ShotCamera = {
  lat: number;
  lng: number;
  heading: number | null;
  source: "exif" | "estimated" | "manual";
  note?: string;
};

export type Location = {
  id: string;
  /** Trip day; null = not scheduled (optional / skipped spots). */
  day: number | null;
  order: number | null;
  /** Locations sharing a group are introduced by a single map segment. */
  group: string | null;
  /** Position in the film's chronology (before-sunrise). */
  filmOrder: number | null;
  place: string;
  placeZh: string;
  scene: string | null;
  /** Approximate time of night in the film, e.g. "约 19:40" (before-sunrise only). */
  filmTime: string | null;
  lat: number;
  lng: number;
  /** false until checked on Google Maps. */
  coordsVerified: boolean;
  isFilmingLocation: boolean;
  /** Replaces "步行约 N 分钟" for the walk to this stop, e.g. "穿过隧道后沿地图上山". */
  walkNoteZh?: string;
  /** Practical tip shown with this stop (walk card + route card), e.g. opening hours. */
  tipZh?: string;
  /** Not a direct walk from the previous stop (explored elsewhere in between): the leg in is drawn dashed. */
  detour?: boolean;
  visited: boolean;
  shots: Shot[];
};

export type MapGroup = { id: string; title: string };

export type TripDay = { day: number; date: string };

/** A real-photo-only collage cut into equal vertical panels. */
export type MontageSource = {
  image: string;
  width: number;
  height: number;
  panels?: number;
  /** Small place label, e.g. "美景宫 · Belvedere". Scenery only, not a check-in. */
  label?: string;
  /** Chapter shown over this image: big script line (chapterEn, e.g. "Day 2"), Chinese line, optional small kicker. */
  chapter?: string;
  chapterEn?: string;
  chapterKicker?: string;
  /** Where it plays: intro = right after the title; afterLocations = right after the last check-in; bonus (default) = after the route card. */
  at?: "intro" | "afterLocations" | "bonus";
  /** Image taller than 9:16: pan from its top to its bottom while on screen. */
  pan?: boolean;
};

export type EasterEgg = {
  enabled: boolean;
  image: string;
  width: number;
  height: number;
  splitRatio: number;
  title: string;
  captionZh: string;
};

export type MapFeature = {
  name: string;
  kind: "river";
  /** [lat, lng] pairs. Hand-drawn approximation, not survey data. */
  points: [number, number][];
};

export type FilmData = {
  id: FilmId;
  title: string;
  titleZh: string;
  year: number;
  city: string;
  cityZh: string;
  dates: string;
  /**
   * route: body follows the trip route, with map segments between groups.
   * film:  body follows the film's chronology, no map segments; route shown at the end.
   */
  structure: "route" | "film";
  /** Show "DAY n" labels. false when the whole pilgrimage fits in one outing. */
  showDay: boolean;
  days: TripDay[];
  start: {
    name: string;
    nameZh: string;
    lat: number;
    lng: number;
    /** Optional photo shown right after the title, before the first walk. */
    /** Hostel photo. at "end" = shown after the finale, closing the loop back to the start point. */
    photo?: { image: string; width: number; height: number; captionZh: string; noteZh?: string; at?: "start" | "end" };
  };
  groups: MapGroup[];
  locations: Location[];
  montage: MontageSource[];
  easterEgg: EasterEgg | null;
  /** Title-card / cover image. merged = film still on top + photo below; fullbleed = fills the 9:16 frame. */
  /**
   * topText = whole image with the title over its top part.
   * feedRows = source rows [y0, y1] shown on the 3:4 feed cover (the 9:16 title card shows the whole image).
   */
  cover?: {
    image: string;
    width: number;
    height: number;
    kind: "merged" | "fullbleed" | "topText";
    splitRatio?: number;
    feedRows?: [number, number];
    /** 3:4 feed cover: the collage re-cut into bands, each [sx, sy, sw, sh] in source pixels (top to bottom). */
    feedBands?: [number, number, number, number][];
  };
  mapFeatures: MapFeature[];
  /** One extra line under the route card's stop list (places off the map, e.g. day-2 trips). */
  routeNote?: string;
  /** Background music, placed against segment boundaries. */
  music?: MusicCue[];
  /** Photo faded in behind the route card's title. */
  routeBackdrop?: { image: string; width: number; height: number };
  /** Closing shot: a vertical collage panned panel by panel, ending on a title. */
  finale?: { image: string; width: number; height: number; panels: number; titleEn: string; titleZh: string; subtitle?: string };
};

/**
 * One music track. It plays from segment `from` to segment `to` ("start"/"end" = video start/end,
 * otherwise a segment kind such as "finale"). `alignSongSec` is the moment in the song that lands
 * exactly on the `alignAt` boundary — e.g. Do-Re-Mi's final "Do!" on the first frame of the finale.
 */
export type MusicCue = {
  src: string;
  from: string;
  to: string;
  alignSongSec: number;
  alignAt: "from" | "to";
  /** Keep playing this long past `to` (with the fade-out), so a final note can ring. */
  tailSec?: number;
  fadeInSec?: number;
  fadeOutSec?: number;
  volume?: number;
  /** Start this long after `from` (e.g. after the record is clicked). */
  delaySec?: number;
  /** From this boundary on, play at `duckVolume` instead (e.g. under the projector sound). */
  duckFrom?: string;
  duckVolume?: number;
};
