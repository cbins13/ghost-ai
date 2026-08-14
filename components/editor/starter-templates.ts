import { NODE_COLORS, SHAPE_DEFAULT_SIZES, type CanvasNodeShape, type CanvasNodeSize } from "@/types/canvas"

export interface TemplateNode {
  id: string
  label: string
  shape: CanvasNodeShape
  color: number
  position: { x: number; y: number }
  size?: CanvasNodeSize
}

export interface TemplateEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: TemplateNode[]
  edges: TemplateEdge[]
}

function node(
  id: string,
  label: string,
  shape: CanvasNodeShape,
  color: number,
  position: { x: number; y: number },
  size?: CanvasNodeSize
): TemplateNode {
  return { id, label, shape, color, position, size: size ?? SHAPE_DEFAULT_SIZES[shape] }
}

function edge(source: string, target: string, label?: string): TemplateEdge {
  return { id: `${source}->${target}`, source, target, label }
}

const MICROSERVICES_TEMPLATE: CanvasTemplate = {
  id: "microservices",
  name: "Microservices Architecture",
  description: "An API gateway routing to independent services backed by their own data stores.",
  nodes: [
    node("gateway", "API Gateway", "hexagon", 1, { x: 320, y: 0 }),
    node("auth", "Auth Service", "rectangle", 2, { x: 60, y: 160 }),
    node("orders", "Orders Service", "rectangle", 6, { x: 320, y: 160 }),
    node("billing", "Billing Service", "rectangle", 3, { x: 580, y: 160 }),
    node("auth-db", "Auth DB", "cylinder", 0, { x: 60, y: 340 }),
    node("orders-db", "Orders DB", "cylinder", 0, { x: 320, y: 340 }),
    node("billing-db", "Billing DB", "cylinder", 0, { x: 580, y: 340 }),
  ],
  edges: [
    edge("gateway", "auth"),
    edge("gateway", "orders"),
    edge("gateway", "billing"),
    edge("auth", "auth-db"),
    edge("orders", "orders-db"),
    edge("billing", "billing-db"),
  ],
}

const CICD_PIPELINE_TEMPLATE: CanvasTemplate = {
  id: "cicd-pipeline",
  name: "CI/CD Pipeline",
  description: "A linear build pipeline from commit to production deploy, with a rollback path.",
  nodes: [
    node("commit", "Commit", "circle", 0, { x: 0, y: 80 }),
    node("build", "Build", "rectangle", 1, { x: 220, y: 80 }),
    node("test", "Test", "rectangle", 6, { x: 440, y: 80 }),
    node("stage", "Deploy: Staging", "rectangle", 3, { x: 660, y: 80 }),
    node("approve", "Manual Approval", "diamond", 4, { x: 660, y: 260 }, { width: 160, height: 100 }),
    node("prod", "Deploy: Production", "rectangle", 2, { x: 900, y: 80 }),
  ],
  edges: [
    edge("commit", "build"),
    edge("build", "test"),
    edge("test", "stage"),
    edge("stage", "approve"),
    edge("approve", "prod", "approved"),
  ],
}

const EVENT_DRIVEN_TEMPLATE: CanvasTemplate = {
  id: "event-driven-system",
  name: "Event-Driven System",
  description: "Producers publish to a message broker that fans out to independent consumers.",
  nodes: [
    node("producer-a", "Order Service", "rectangle", 2, { x: 0, y: 0 }),
    node("producer-b", "Payment Service", "rectangle", 2, { x: 0, y: 160 }),
    node("broker", "Message Broker", "hexagon", 5, { x: 300, y: 80 }),
    node("consumer-a", "Notification Worker", "rectangle", 6, { x: 600, y: 0 }),
    node("consumer-b", "Analytics Worker", "rectangle", 7, { x: 600, y: 160 }),
  ],
  edges: [
    edge("producer-a", "broker"),
    edge("producer-b", "broker"),
    edge("broker", "consumer-a"),
    edge("broker", "consumer-b"),
  ],
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  MICROSERVICES_TEMPLATE,
  CICD_PIPELINE_TEMPLATE,
  EVENT_DRIVEN_TEMPLATE,
]

export function resolveTemplateColor(index: number) {
  return NODE_COLORS[index] ?? NODE_COLORS[0]
}
