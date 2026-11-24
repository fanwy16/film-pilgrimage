import React from "react";
import { Img, staticFile } from "remotion";
import { FilmTheme } from "../../theme";

/** An image drawn at an explicit size with the film's colour grade applied. */
export const GradedImage: React.FC<{
  src: string;
  width: number;
  height: number;
  theme: FilmTheme;
  style?: React.CSSProperties;
}> = ({ src, width, height, theme, style }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width, height, ...style }}>
    <Img
      src={staticFile(src)}
      style={{ width, height, display: "block", filter: theme.grade.filter }}
    />
    <div style={{ position: "absolute", inset: 0, backgroundColor: theme.grade.tint }} />
  </div>
);
