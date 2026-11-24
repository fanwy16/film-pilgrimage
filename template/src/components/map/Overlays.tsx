import React from "react";
import { FilmTheme } from "../../theme";

/** Route line drawn progressively from 0 → 1. */
export const RouteLine: React.FC<{ d: string; progress: number; color: string; width?: number; dashed?: boolean }> = ({
  d,
  progress,
  color,
  width = 7,
  dashed = false,
}) => (
  <g>
    {dashed ? (
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray="2 18" opacity={0.6} />
    ) : null}
    <path
      d={d}
      pathLength={1}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray="1 1"
      strokeDashoffset={1 - progress}
      opacity={dashed ? 0 : 1}
    />
  </g>
);

/** A location marker with optional number and label. `pop` animates 0 → 1. */
export const Marker: React.FC<{
  x: number;
  y: number;
  pop: number;
  theme: FilmTheme;
  label?: string;
  number?: number;
  color?: string;
  hollow?: boolean;
  labelSide?: "left" | "right";
}> = ({ x, y, pop, theme, label, number, color, hollow = false, labelSide = "right" }) => {
  const { colors, fonts } = theme;
  const c = color ?? colors.marker;
  const r = number !== undefined ? 36 : 14;
  const fontSize = 38;
  const labelWidth = label ? label.length * fontSize * 1.02 + 36 : 0;
  const lx = labelSide === "right" ? x + r + 14 : x - r - 14 - labelWidth;
  return (
    <g opacity={Math.min(1, pop * 1.5)} style={{ transformOrigin: `${x}px ${y}px`, transform: `scale(${0.4 + 0.6 * pop})` }}>
      <circle cx={x} cy={y} r={r + 6} fill={colors.mapLand} opacity={0.9} />
      <circle cx={x} cy={y} r={r} fill={hollow ? colors.mapLand : c} stroke={c} strokeWidth={5} />
      {number !== undefined ? (
        <text x={x} y={y + 13} textAnchor="middle" fontFamily={fonts.latin} fontSize={38} fontWeight={600} fill={colors.mapLand}>
          {number}
        </text>
      ) : null}
      {label ? (
        <g>
          <rect x={lx} y={y - 32} width={labelWidth} height={64} rx={8} fill={colors.labelBg} />
          <text x={lx + 18} y={y + 13} fontFamily={fonts.zh} fontSize={fontSize} fill={colors.ink}>
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
};
