/**
 * Turns film JSON into an ordered list of segments with frame lengths.
 * All durations come from theme.ts.
 */
import { FilmData, LatLng, Location, Shot } from "../types";
import { FilmTheme, VIDEO } from "../theme";
import { Bounds, boundsOf } from "./geo";

export type MontageItem = {
  image: string;
  width: number;
  height: number;
  /** Crop band, as fractions of image height. */
  y0: number;
  y1: number;
  label?: string;
  chapter?: string;
  chapterEn?: string;
  chapterKicker?: string;
  pan?: boolean;
};

/** Frames one montage image stays up (chapter openers and pans get longer). Shared with EndingMontage. */
export const montageItemFrames = (item: MontageItem, baseFrames: number) =>
  item.pan ? Math.max(baseFrames, Math.round(2.6 * fps)) : baseFrames + (item.chapter ? Math.round(0.6 * fps) : 0);
export const MONTAGE_OVERLAP_SEC = 0.35;
/** Length of the closing collage shot (see Finale.tsx for its internal timing). */
export const FINALE_SEC = 6.5;

export type Segment =
  | { kind: "title"; frames: number }
  | { kind: "start"; frames: number; image: string; width: number; height: number; captionZh: string; noteZh?: string; at?: "start" | "end" }
  | {
      kind: "map";
      frames: number;
      title: string;
      day: number;
      from: (LatLng & { label: string }) | null;
      points: Location[];
      cameraFrom: Bounds;
      cameraTo: Bounds;
      overview?: boolean;
    }
  | {
      kind: "location";
      frames: number;
      location: Location;
      index: number; // 1-based among visited
      total: number;
      shotFrames: number[];
      previousLocation: Location | null;
      nextLocation: Location | null;
    }
  | { kind: "montage"; frames: number; items: MontageItem[]; itemFrames: number; cityZh: string; filmId: FilmData["id"] }
  | { kind: "routeCard"; frames: number }
  | { kind: "finale"; frames: number }
  | { kind: "easterEgg"; frames: number; blackFrames: number; shotFrames: number };

export type Options = {
  /** Only include these trip days. null = all. */
  days: number[] | null;
};

const fps = VIDEO.fps;

const makeFrames = (theme: FilmTheme) => (sec: number) => {
  const raw = Math.round(sec * fps);
  const { bpm } = theme.timing;
  if (!bpm) return Math.max(1, raw);
  const beat = (fps * 60) / bpm;
  return Math.round(Math.max(1, Math.round(raw / beat)) * beat);
};

/** Visited locations for the chosen days, in trip order (day, order). */
export const visitedInRouteOrder = (film: FilmData, opts: Options): Location[] =>
  film.locations
    .filter((l) => l.visited && l.shots.length > 0)
    .filter((l) => opts.days === null || (l.day !== null && opts.days.indexOf(l.day) !== -1))
    .sort((a, b) => (a.day ?? 99) - (b.day ?? 99) || (a.order ?? 99) - (b.order ?? 99));

const visitedInFilmOrder = (film: FilmData, opts: Options): Location[] =>
  visitedInRouteOrder(film, opts).sort((a, b) => (a.filmOrder ?? 99) - (b.filmOrder ?? 99));

export const shotLength = (theme: FilmTheme) => {
  const f = makeFrames(theme);
  const t = theme.timing;
  return (shot: Shot, isRepeat: boolean) => {
    const hold = t.holdSec * (isRepeat ? theme.repeatHoldScale : 1);
    return f(t.filmRevealSec + t.wipeSec + t.overlayHoldSec + t.splitSec + hold);
  };
};

/** Frames of the walk phase that opens every location segment (the dot walks to the stop on the big map). */
export const walkFrames = (theme: FilmTheme) => makeFrames(theme)(theme.timing.miniMapTravelSec);

export const buildTimeline = (film: FilmData, theme: FilmTheme, opts: Options): Segment[] => {
  const f = makeFrames(theme);
  const t = theme.timing;
  const shotFrames = shotLength(theme);
  const segments: Segment[] = [{ kind: "title", frames: f(t.titleSec) }];
  if (film.start.photo && film.start.photo.at !== "end") segments.push({ kind: "start", frames: f(2.5), ...film.start.photo });


  const body = film.structure === "route" ? visitedInRouteOrder(film, opts) : visitedInFilmOrder(film, opts);
  const total = body.length;


  const makeMontage = (at: "intro" | "afterLocations" | "bonus") => {
    const sources = film.montage.filter((m) => (m.at ?? "bonus") === at);
    const items: MontageItem[] = [];
    sources.forEach((m) => {
      const panels = m.panels ?? 1;
      for (let p = 0; p < panels; p++) items.push({ image: m.image, width: m.width, height: m.height, y0: p / panels, y1: (p + 1) / panels, label: m.label, chapter: p === 0 ? m.chapter : undefined, chapterEn: p === 0 ? m.chapterEn : undefined, chapterKicker: p === 0 ? m.chapterKicker : undefined, pan: m.pan });
    });
    if (!items.length) return;
    const baseFrames = f(t.sceneryShotSec);
    const overlapFrames = Math.round(MONTAGE_OVERLAP_SEC * fps);
    const frames = items.reduce((sum, item) => sum + montageItemFrames(item, baseFrames), 0) - Math.max(0, items.length - 1) * overlapFrames;
    segments.push({ kind: "montage", frames, items, itemFrames: baseFrames, cityZh: film.cityZh, filmId: film.id });
  };
  makeMontage("intro");
  if (body.length > 0) {
    const routeBounds = boundsOf([film.start, ...body]);
    segments.push({
      kind: "map",
      frames: f(t.mapSec + 1.1), // +0.6s so the finished route holds before the dip
      title: "全程路线",
      day: 0,
      from: { ...film.start, label: film.start.nameZh },
      points: body,
      cameraFrom: routeBounds,
      cameraTo: routeBounds,
      overview: true,
    });
  }
  body.forEach((loc, i) => {
    const shots = loc.shots;
    const frames = shots.map((shot, shotIndex) => shotFrames(shot, shotIndex > 0));
    const previousLocation = i > 0 && body[i - 1].day === loc.day ? body[i - 1] : null;
    segments.push({ kind: "location", frames: walkFrames(theme) + frames.reduce((a, b) => a + b, 0), index: i + 1, total, shotFrames: frames, previousLocation, nextLocation: i + 1 < body.length ? body[i + 1] : null, location: { ...loc, shots } });
  });
  makeMontage("afterLocations");
  // Hostel photo: closes the loop at the end, or opens the video (default).
  const hostel = film.start.photo;
  const hostelSeg = hostel ? ({ kind: "start", frames: f(2.5), ...hostel } as const) : null;
  if (film.finale) segments.push({ kind: "finale", frames: Math.round(FINALE_SEC * fps) });
  if (hostelSeg && hostel?.at === "end") segments.push(hostelSeg);
  if (theme.segments.routeCard) segments.push({ kind: "routeCard", frames: f(t.routeCardSec) });
  makeMontage("bonus");

  if (film.easterEgg?.enabled) {
    const frames = Math.round(9.2 * fps);
    segments.push({ kind: "easterEgg", frames, blackFrames: 0, shotFrames: frames });
  }

  return segments;
};

export const totalFrames = (segments: Segment[]) => segments.reduce((a, s) => a + s.frames, 0);

export type TravelState = {
  phase: "overview" | "walk" | "shrink" | "photos" | "grow" | "route";
  from: Location | null;
  to: Location | null;
  progress: number;
  location: Location | null;
};

/** Resolve the persistent travel-map state from a composition-global frame. */
export const travelState = (frame: number, film: FilmData, theme: FilmTheme, opts: Options): TravelState => {
  const segments = buildTimeline(film, theme, opts);
  let cursor = 0;
  for (const segment of segments) {
    const end = cursor + segment.frames;
    if (frame < end) {
      if (segment.kind === "location") {
        const walk = Math.round(theme.timing.miniMapTravelSec * fps);
        const shrink = Math.round(0.7 * fps);
        const grow = shrink;
        const from = segment.previousLocation;
        const to = segment.location;
        if (frame - cursor < walk) return { phase: "walk", from, to, progress: (frame - cursor) / walk, location: to };
        if (frame - cursor < walk + shrink) return { phase: "shrink", from, to, progress: (frame - cursor - walk) / shrink, location: to };
        if (frame - cursor >= segment.frames - grow) return { phase: "grow", from, to, progress: (frame - cursor - (segment.frames - grow)) / grow, location: to };
        return { phase: "photos", from, to, progress: 1, location: to };
      }
      if (segment.kind === "routeCard" || segment.kind === "montage" || segment.kind === "easterEgg") return { phase: "route", from: null, to: null, progress: Math.min(1, (frame - cursor) / Math.max(1, segment.frames)), location: null };
      return { phase: "overview", from: null, to: null, progress: Math.min(1, (frame - cursor) / Math.max(1, segment.frames)), location: null };
    }
    cursor = end;
  }
  return { phase: "route", from: null, to: null, progress: 1, location: null };
};
