import React from "react";
import { FilmTheme } from "../../theme";

/**
 * Small key for route maps: what the solid and dashed lines mean, and which colour is which day.
 * Only shows the parts that are actually on the map.
 */
export const RouteLegend: React.FC<{
  theme: FilmTheme;
  days: { day: number | null; color: string }[];
  showDetour: boolean;
  left: number;
  top: number;
}> = ({ theme, days, showDetour, left, top }) => {
  const { colors, fonts } = theme;
  const ink = colors.ink;
  const item: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" };
  const swatch = (dashed: boolean) => (
    <svg width={44} height={10}>
      <line x1={2} y1={5} x2={42} y2={5} stroke={ink} strokeWidth={4} strokeLinecap="round" strokeDasharray={dashed ? "3 9" : undefined} />
    </svg>
  );
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "10px 18px",
        backgroundColor: colors.labelBg,
        borderRadius: 10,
        fontFamily: fonts.zh,
        fontSize: 26,
        color: ink,
      }}
    >
      {showDetour ? (
        <>
          <div style={item}>
            {swatch(false)}
            步行
          </div>
          <div style={item}>
            {swatch(true)}
            中间去了别处
          </div>
        </>
      ) : null}
      {days.length > 1
        ? days.map(({ day, color }) => (
            <div key={String(day)} style={item}>
              <span style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, display: "inline-block" }} />
              <span style={{ fontFamily: fonts.latin, letterSpacing: 2 }}>DAY {day}</span>
            </div>
          ))
        : null}
    </div>
  );
};
