import type { CanvasNodeShape } from "@/types/canvas"

export const SHAPE_GEOMETRY = {
  diamond: { points: "50,3 97,50 50,97 3,50" },
  hexagon: { points: "26,3 74,3 97,50 74,97 26,97 3,50" },
  cylinder: {
    bodyPath: "M3,12 L3,88 A47,12 0 0,0 97,88 L97,12",
    topEllipse: { cx: 50, cy: 12, rx: 47, ry: 12 },
    bottomEllipse: { cx: 50, cy: 88, rx: 47, ry: 12 },
  },
} as const

interface ShapeVisualProps {
  shape: CanvasNodeShape
  fill: string
  borderColor: string
  borderWidth?: number
  className?: string
}

export function ShapeVisual({
  shape,
  fill,
  borderColor,
  borderWidth = 1.5,
  className = "",
}: Readonly<ShapeVisualProps>) {
  if (shape === "rectangle") {
    return (
      <div
        className={`absolute inset-0 rounded-xl ${className}`}
        style={{ backgroundColor: fill, border: `${borderWidth}px solid ${borderColor}` }}
      />
    )
  }

  if (shape === "pill" || shape === "circle") {
    return (
      <div
        className={`absolute inset-0 rounded-full ${className}`}
        style={{ backgroundColor: fill, border: `${borderWidth}px solid ${borderColor}` }}
      />
    )
  }

  if (shape === "diamond" || shape === "hexagon") {
    return (
      <svg className={`absolute inset-0 h-full w-full ${className}`} preserveAspectRatio="none" viewBox="0 0 100 100">
        <polygon fill={fill} points={SHAPE_GEOMETRY[shape].points} stroke={borderColor} strokeWidth={borderWidth} />
      </svg>
    )
  }

  const { bodyPath, topEllipse, bottomEllipse } = SHAPE_GEOMETRY.cylinder

  return (
    <svg className={`absolute inset-0 h-full w-full ${className}`} preserveAspectRatio="none" viewBox="0 0 100 100">
      <ellipse
        cx={bottomEllipse.cx}
        cy={bottomEllipse.cy}
        fill={fill}
        rx={bottomEllipse.rx}
        ry={bottomEllipse.ry}
        stroke={borderColor}
        strokeWidth={borderWidth}
      />
      <path d={bodyPath} fill={fill} stroke="none" />
      <line stroke={borderColor} strokeWidth={borderWidth} x1={3} x2={3} y1={12} y2={88} />
      <line stroke={borderColor} strokeWidth={borderWidth} x1={97} x2={97} y1={12} y2={88} />
      <ellipse
        cx={topEllipse.cx}
        cy={topEllipse.cy}
        fill={fill}
        rx={topEllipse.rx}
        ry={topEllipse.ry}
        stroke={borderColor}
        strokeWidth={borderWidth}
      />
    </svg>
  )
}
