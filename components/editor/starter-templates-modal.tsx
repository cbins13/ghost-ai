"use client"

import { SHAPE_GEOMETRY } from "@/components/editor/shape-visual"
import { CANVAS_TEMPLATES, resolveTemplateColor, type CanvasTemplate, type TemplateNode } from "@/components/editor/starter-templates"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface StarterTemplatesModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: CanvasTemplate) => void
}

const PREVIEW_HEIGHT = 200
const PREVIEW_PADDING = 16

function transformGeometryPoints(points: string, x: number, y: number, width: number, height: number) {
  return points
    .split(" ")
    .map((pair) => {
      const [px, py] = pair.split(",").map(Number)
      return `${x + (px / 100) * width},${y + (py / 100) * height}`
    })
    .join(" ")
}

function PreviewNodeShape({ templateNode }: Readonly<{ templateNode: TemplateNode }>) {
  const size = templateNode.size
  if (!size) {
    return null
  }

  const color = resolveTemplateColor(templateNode.color)
  const { x, y } = templateNode.position
  const { width, height } = size

  if (templateNode.shape === "rectangle") {
    return <rect fill={color.fill} height={height} rx={8} stroke={color.text} strokeWidth={1} width={width} x={x} y={y} />
  }

  if (templateNode.shape === "pill" || templateNode.shape === "circle") {
    return (
      <rect fill={color.fill} height={height} rx={height / 2} stroke={color.text} strokeWidth={1} width={width} x={x} y={y} />
    )
  }

  if (templateNode.shape === "diamond" || templateNode.shape === "hexagon") {
    return (
      <polygon
        fill={color.fill}
        points={transformGeometryPoints(SHAPE_GEOMETRY[templateNode.shape].points, x, y, width, height)}
        stroke={color.text}
        strokeWidth={1}
      />
    )
  }

  const rx = width / 2
  const ellipseHeight = Math.min(height * 0.24, 16)
  return (
    <g>
      <rect fill={color.fill} height={height - ellipseHeight} width={width} x={x} y={y + ellipseHeight / 2} />
      <ellipse cx={x + rx} cy={y + ellipseHeight / 2} fill={color.fill} rx={rx} ry={ellipseHeight / 2} stroke={color.text} strokeWidth={1} />
      <ellipse
        cx={x + rx}
        cy={y + height - ellipseHeight / 2}
        fill={color.fill}
        rx={rx}
        ry={ellipseHeight / 2}
        stroke={color.text}
        strokeWidth={1}
      />
      <line stroke={color.text} strokeWidth={1} x1={x} x2={x} y1={y + ellipseHeight / 2} y2={y + height - ellipseHeight / 2} />
      <line
        stroke={color.text}
        strokeWidth={1}
        x1={x + width}
        x2={x + width}
        y1={y + ellipseHeight / 2}
        y2={y + height - ellipseHeight / 2}
      />
    </g>
  )
}

function TemplatePreview({ template }: Readonly<{ template: CanvasTemplate }>) {
  const minX = Math.min(...template.nodes.map((n) => n.position.x))
  const minY = Math.min(...template.nodes.map((n) => n.position.y))
  const maxX = Math.max(...template.nodes.map((n) => n.position.x + (n.size?.width ?? 0)))
  const maxY = Math.max(...template.nodes.map((n) => n.position.y + (n.size?.height ?? 0)))

  const contentWidth = Math.max(maxX - minX, 1)
  const contentHeight = Math.max(maxY - minY, 1)

  const viewBox = [
    minX - PREVIEW_PADDING,
    minY - PREVIEW_PADDING,
    contentWidth + PREVIEW_PADDING * 2,
    contentHeight + PREVIEW_PADDING * 2,
  ].join(" ")

  function nodeCenter(nodeId: string) {
    const templateNode = template.nodes.find((candidate) => candidate.id === nodeId)
    const size = templateNode?.size
    if (!templateNode || !size) {
      return null
    }
    return { x: templateNode.position.x + size.width / 2, y: templateNode.position.y + size.height / 2 }
  }

  return (
    <div className="w-full overflow-hidden rounded-lg bg-base" style={{ height: PREVIEW_HEIGHT }}>
      <svg className="h-full w-full" preserveAspectRatio="xMidYMid meet" viewBox={viewBox}>
        {template.edges.map((templateEdge) => {
          const from = nodeCenter(templateEdge.source)
          const to = nodeCenter(templateEdge.target)
          if (!from || !to) {
            return null
          }
          return (
            <line
              key={templateEdge.id}
              stroke="var(--border-subtle)"
              strokeWidth={1.5}
              x1={from.x}
              x2={to.x}
              y1={from.y}
              y2={to.y}
            />
          )
        })}
        {template.nodes.map((templateNode) => (
          <PreviewNodeShape key={templateNode.id} templateNode={templateNode} />
        ))}
      </svg>
    </div>
  )
}

export function StarterTemplatesModal({
  isOpen,
  onOpenChange,
  onImport,
}: Readonly<StarterTemplatesModalProps>) {
  function handleImport(template: CanvasTemplate) {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="max-h-[90vh] w-full max-w-7xl overflow-y-auto sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>Starter templates</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CANVAS_TEMPLATES.map((template) => (
            <div
              className="flex flex-col gap-4 overflow-hidden rounded-xl border border-surface-border bg-surface p-4"
              key={template.id}
            >
              <TemplatePreview template={template} />
              <div>
                <h3 className="text-base font-medium text-copy-primary">{template.name}</h3>
                <p className="mt-1 text-sm text-copy-muted">{template.description}</p>
              </div>
              <Button onClick={() => handleImport(template)}>Import</Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
