import type { ELK, ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { Schematic, SchematicEdge, SchematicNode } from './graph'
import { textWidth } from './graph'

export type Point = { x: number; y: number }

export type PlacedNode = SchematicNode & Point

export interface PlacedEdge extends SchematicEdge {
  points: Point[]
  labelPos: Point | null
}

export interface Layout {
  nodes: PlacedNode[]
  edges: PlacedEdge[]
  width: number
  height: number
}

// ELK is most of the bundle, so load it on first use rather than at startup.
let elk: Promise<ELK> | null = null
const getElk = () =>
  (elk ??= import('elkjs/lib/elk.bundled.js').then(({ default: ElkConstructor }) => new ElkConstructor()))

const LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.padding': '[top=30,left=30,bottom=30,right=30]',
  'elk.spacing.nodeNode': '36',
  'elk.spacing.edgeNode': '18',
  'elk.spacing.edgeEdge': '10',
  'elk.layered.spacing.nodeNodeBetweenLayers': '70',
  'elk.layered.spacing.edgeNodeBetweenLayers': '20',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.feedbackEdges': 'true',
  'elk.edgeLabels.placement': 'CENTER',
}

/**
 * Network-simplex placement gives the straightest wires but its cost grows steeply:
 * the 36-PE mesh in tests/designs/stress (168 edges) takes ~8 s with it and ~170 ms with
 * Brandes-Köpf. Small diagrams keep the nicer placement.
 */
const NETWORK_SIMPLEX_MAX_EDGES = 60

const LABEL_HEIGHT = 12

/** Position the nodes of a schematic and route its edges with ELK's layered algorithm. */
export async function layoutSchematic(schematic: Schematic): Promise<Layout> {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      ...LAYOUT_OPTIONS,
      'elk.layered.nodePlacement.strategy':
        schematic.edges.length <= NETWORK_SIMPLEX_MAX_EDGES ? 'NETWORK_SIMPLEX' : 'BRANDES_KOEPF',
    },
    children: schematic.nodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
      layoutOptions: {
        'elk.portConstraints': 'FIXED_POS',
        ...(node.kind === 'boundary' && {
          // Keep module inputs in the first column and outputs in the last.
          'elk.layered.layering.layerConstraint': node.direction === 'output' ? 'LAST' : 'FIRST',
        }),
      },
      ports: node.ports.map((port) => ({
        id: port.id,
        x: port.x,
        y: port.y,
        width: 0,
        height: 0,
        layoutOptions: { 'elk.port.side': port.side },
      })),
    })),
    edges: schematic.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
      labels: edge.label
        ? [{ id: `${edge.id}:label`, text: edge.label, width: textWidth(edge.label) * 0.9, height: LABEL_HEIGHT }]
        : [],
    })),
  }

  const result = await (await getElk()).layout(graph)

  const positions = new Map((result.children ?? []).map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]))
  const routed = new Map((result.edges ?? []).map((e) => [e.id, e]))

  return {
    nodes: schematic.nodes.map((node) => ({ ...node, ...positions.get(node.id)! })),
    edges: schematic.edges.map((edge) => {
      const out = routed.get(edge.id)
      const section = out?.sections?.[0]
      const points = section ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint] : []
      const label = out?.labels?.[0]
      return {
        ...edge,
        points: points.map(({ x, y }) => ({ x, y })),
        labelPos: label?.x !== undefined && label.y !== undefined ? { x: label.x, y: label.y + LABEL_HEIGHT - 2 } : null,
      }
    }),
    width: result.width ?? 0,
    height: result.height ?? 0,
  }
}
