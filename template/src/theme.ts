/**
 * ★ All tweakable parameters live here: colours, fonts, durations, grading.
 * Change a number, save, and Studio reloads.
 */
import { FilmId } from "./types";

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
};

export type FilmTheme = {
  space: { xs: 8; s: 16; m: 24; l: 32; xl: 48; xxl: 64 };
  skin: "scroll" | "filmstrip";
  /** MapLibre style JSON URL used for live map backgrounds. */
  mapStyle: string;
  /** CSS filter applied to the map canvas container. */
  mapFilter: string;
  /** Hold multiplier for the second and later shots at one location. */
  repeatHoldScale: number;
  /** Whether location mini-maps show the route and next-stop text. */
  miniMapRoute: boolean;
  /** Number style for the running location header. */
  indexStyle: "number" | "solfege";
  /** Title-card opening. vinyl = click a record, needle drops, music starts. */
  opening: "none" | "vinyl";
  /** How the film-scene line is marked in captions: note = ♪ scene, quote = 「scene」. */
  sceneMark: "note" | "quote";
  /** Script font for montage chapter titles (loaded in Cover.tsx). */
  scriptFont: "bodoni" | "pinyon";
  colors: {
    bg: string;
    ink: string; // main text
    muted: string; // secondary text
    accent: string;
    mapLand: string;
    mapGrid: string;
    mapWater: string;
    route: string;
    marker: string;
    labelBg: string;
    dayColors: string[]; // route card: one colour per day
  };
  fonts: {
    /** Latin text (titles, German place names). Loaded from Google Fonts in fonts.ts. */
    latin: string;
    /** Chinese text. System fonts on macOS; Noto Serif SC as fallback if installed. */
    zh: string;
  };
  grade: {
    /** CSS filter applied to every photo / still. */
    filter: string;
    /** Colour laid over photos; use alpha to control strength. */
    tint: string;
    /** Film grain opacity, 0 = off. */
    grain: number;
  };
  timing: {
    /** Snap segment lengths to the beat. null = no snapping. */
    bpm: number | null;
    titleSec: number;
    mapSec: number;
    /** Part of mapSec spent panning/zooming the camera. */
    mapCameraSec: number;
    /** How long only the film still is visible. */
    filmRevealSec: number;
    overlayHoldSec: number;
    splitSec: number;
    /** Duration of the real photo sliding up. */
    wipeSec: number;
    /** How long the full merged image stays after the wipe. */
    holdSec: number;
    captionFadeSec: number;
    sceneryShotSec: number;
    routeCardSec: number;
    easterEggBlackSec: number;
    miniMapTravelSec: number;
  };
  segments: {
    montage: boolean;
    routeCard: boolean;
  };
};

const ZH_SERIF = '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", serif';

export const THEMES: Record<FilmId, FilmTheme> = {
  "sound-of-music": {
    space: { xs: 8, s: 16, m: 24, l: 32, xl: 48, xxl: 64 },
    skin: "scroll",
    mapStyle: "https://tiles.openfreemap.org/styles/positron",
    mapFilter: "sepia(0.25) saturate(0.9)",
    repeatHoldScale: 0.5,
    miniMapRoute: true,
    indexStyle: "solfege",
    opening: "none",
    sceneMark: "note",
    scriptFont: "pinyon",
    colors: {
      bg: "#f4ecdf",
      ink: "#2a2018",
      muted: "#8a7863",
      accent: "#c0532c",
      mapLand: "#efe3cd",
      mapGrid: "rgba(90, 70, 40, 0.08)",
      mapWater: "#a7cbd9",
      route: "#c0532c",
      marker: "#2a2018",
      labelBg: "rgba(255, 250, 240, 0.92)",
      dayColors: ["#c0532c", "#2f7d6d", "#7b5ea7"],
    },
    fonts: { latin: "Cormorant Garamond", zh: ZH_SERIF },
    grade: {
      filter: "saturate(1.12) contrast(1.04) brightness(1.03)",
      tint: "rgba(255, 170, 90, 0.07)",
      grain: 0,
    },
    timing: {
      bpm: 128, // Do-Re-Mi's closing section, which plays under the check-ins
      titleSec: 2,
      mapSec: 2.5,
      mapCameraSec: 1.2,
      filmRevealSec: 1.0,
      wipeSec: 1.4,
      overlayHoldSec: 0.3,
      splitSec: 0.7,
      holdSec: 1.5,
      miniMapTravelSec: 2.2,
      captionFadeSec: 0.35,
      sceneryShotSec: 1.2,
      routeCardSec: 3,
      easterEggBlackSec: 1,
    },
    segments: { montage: true, routeCard: true },
  },

  "before-sunrise": {
    space: { xs: 8, s: 16, m: 24, l: 32, xl: 48, xxl: 64 },
    skin: "filmstrip",
    mapStyle: "https://tiles.openfreemap.org/styles/dark",
    mapFilter: "brightness(1.55) contrast(1.12) saturate(0.9)",
    repeatHoldScale: 0.5,
    miniMapRoute: true,
    indexStyle: "number",
    opening: "vinyl",
    sceneMark: "quote",
    scriptFont: "bodoni",
    colors: {
      bg: "#141619",
      ink: "#e6e3dc",
      muted: "#8b9098",
      accent: "#a9bccf",
      mapLand: "#1b1e22",
      mapGrid: "rgba(200, 210, 225, 0.05)",
      mapWater: "#2c3a47",
      route: "#cfd8e2",
      marker: "#e6e3dc",
      labelBg: "rgba(20, 22, 25, 0.85)",
      dayColors: ["#cfd8e2", "#c9a27e", "#8fa98f"],
    },
    fonts: { latin: "Cormorant Garamond", zh: ZH_SERIF },
    grade: {
      filter: "saturate(0.72) contrast(1.06) brightness(0.93)",
      tint: "rgba(110, 135, 165, 0.10)",
      grain: 0.12,
    },
    timing: {
      bpm: null,
      titleSec: 4.4, // record click + the panels opening up
      mapSec: 2.8,
      mapCameraSec: 1.6,
      filmRevealSec: 1.6,
      wipeSec: 1.8,
      overlayHoldSec: 0.4,
      splitSec: 0.9,
      holdSec: 2.2,
      miniMapTravelSec: 2.4,
      captionFadeSec: 0.7,
      sceneryShotSec: 1.7,
      routeCardSec: 3.5,
      easterEggBlackSec: 1,
    },
    segments: { montage: true, routeCard: true },
  },
};
