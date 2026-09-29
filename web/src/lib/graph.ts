import type { BlockKind, Direction, ModuleInstance, SignalRef } from '../types'
import { classifyModule, MODULE_TYPE_LABELS, type ModuleType } from './classify'
import { overlap, refLabel, splitRef, type Selection } from './refs'

// Geometry shared by graph building (which fixes port positions) and the renderer.
export const PORT_PITCH = 18
export const HEADER_HEIGHT = 38
export const CHAR_WIDTH = 6.6

export type Side = 'WEST' | 'EAST' | 'SOUTH'
export type SignalClass = 'clock' | 'reset' | 'data'

export interface SchematicPort {
  id: string
  name: string
  side: Side
  /** Offset from the node's top-left corner. */
  x: number
  y: number
  clock: boolean
}

interface NodeBase {
  id: string
  label: string
  width: number
  height: number
  ports: SchematicPort[]
}

/** A port of the module being viewed, drawn on the diagram's edge. */
export interface BoundaryNode extends NodeBase {
  kind: 'boundary'
  direction: Direction
  busWidth: number
}

export interface InstanceNode extends NodeBase {
  kind: 'instance'
  module: string
  moduleType: ModuleType
  /** Index into the parent's `instances`, used to drill down. */
  index: number
}

export interface BlockNode extends NodeBase {
  kind: 'block'
  blockKind: BlockKind
  line: number
}

export type SchematicNode = BoundaryNode | InstanceNode | BlockNode

export interface SchematicEdge {
  id: string
  net: string
  source: string
  target: string
  busWidth: number
  signalClass: SignalClass
  /** Only the first edge of each net carries the label, to avoid clutter. */
  label: string | null
}

export interface Schematic {
  nodes: SchematicNode[]
  edges: SchematicEdge[]
}

export const textWidth = (s: string) => s.length * CHAR_WIDTH

const BLOCK_LABELS: Record<BlockKind, string> = {
  always_ff: 'always_ff',
  always_comb: 'always_comb',
  always_latch: 'always_latch',
  always: 'always',
  initial: 'initial',
  final: 'final',
  assign: 'assign',
}

interface Endpoint {
  portId: string
  selection: Selection
}

/** Everything attached to one declared signal. */
interface Net {
  drivers: Endpoint[]
  sinks: Endpoint[]
}

/** Build the schematic for the contents of one module instance. */
export function buildSchematic(inst: ModuleInstance): Schematic {
  const nodes: SchematicNode[] = []
  const nets = new Map<string, Net>()
  const clockPorts = new Set<string>()

  const attach = (ref: SignalRef, portId: string, direction: Direction) => {
    const { signal, selection } = splitRef(ref)
    let n = nets.get(signal)
    if (!n) nets.set(signal, (n = { drivers: [], sinks: [] }))
    if (direction !== 'input') n.drivers.push({ portId, selection })
    if (direction !== 'output') n.sinks.push({ portId, selection })
  }

  for (const port of inst.ports) {
    const id = `port:${port.name}`
    const label = port.width > 1 ? `${port.name} [${port.width}]` : port.name
    const width = Math.max(64, textWidth(label) + 28)
    const height = 24
    // Seen from inside the module, an input port drives the internal net.
    const side: Side = port.direction === 'output' ? 'WEST' : 'EAST'
    nodes.push({
      kind: 'boundary',
      id,
      label,
      direction: port.direction,
      busWidth: port.width,
      width,
      height,
      ports: [{ id: `${id}:p`, name: port.name, side, x: side === 'EAST' ? width : 0, y: height / 2, clock: false }],
    })
    const flipped: Direction = port.direction === 'input' ? 'output' : port.direction === 'output' ? 'input' : 'inout'
    attach({ name: port.name, bits: null }, `${id}:p`, flipped)
  }

  inst.instances.forEach((child, index) => {
    const id = `inst:${index}`
    const moduleType = classifyModule(child)
    const pins = child.ports.map((p) => ({ name: p.name, direction: p.direction }))
    const clockPins = new Set(child.blocks.flatMap((b) => b.clocks.map((c) => c.name)))
    nodes.push({
      kind: 'instance',
      id,
      label: child.name,
      module: child.module,
      moduleType,
      index,
      ...boxGeometry(id, [child.name, instanceSubtitle(child.module, moduleType)], pins, clockPins),
    })
    for (const conn of child.connections ?? []) {
      for (const ref of conn.signals) attach(ref, `${id}:${conn.port}`, conn.direction)
    }
  })

  for (const block of inst.blocks) {
    const id = `blk:${block.id}`
    const label = block.name ?? BLOCK_LABELS[block.kind]
    // Block pins are named after what they touch, e.g. `carry[0]`.
    const pins = [
      ...block.reads.map((ref) => ({ name: refLabel(ref), direction: 'input' as const })),
      ...block.writes.map((ref) => ({ name: refLabel(ref), direction: 'output' as const })),
    ]
    const clocks = new Set(block.clocks.map(refLabel))
    nodes.push({
      kind: 'block',
      id,
      label,
      blockKind: block.kind,
      line: block.line,
      ...boxGeometry(id, [label, `line ${block.line}`], pins, clocks),
    })
    for (const ref of block.reads) attach(ref, `${id}:in:${refLabel(ref)}`, 'input')
    for (const ref of block.writes) attach(ref, `${id}:out:${refLabel(ref)}`, 'output')
    for (const ref of block.clocks) clockPorts.add(`${id}:in:${refLabel(ref)}`)
  }

  const widths = new Map<string, number>()
  for (const p of inst.ports) widths.set(p.name, p.width)
  for (const s of inst.signals) widths.set(s.name, s.width)

  // A driver feeds a sink when what they touch overlaps: `carry` (whole) reaches `carry[3]`
  // and the array `row_in` reaches its element `row_in[0]`, but `carry[1]` doesn't reach `carry[2]`.
  const edges: SchematicEdge[] = []
  for (const [name, { drivers, sinks }] of nets) {
    const signalWidth = widths.get(name) ?? 1
    const signalClass = classifySignal(name, sinks.some((s) => clockPorts.has(s.portId)))
    const labelled = new Set<string>()
    for (const source of drivers) {
      for (const target of sinks) {
        if (source.portId === target.portId) continue
        const shared = overlap(source.selection, target.selection)
        if (shared === undefined) continue
        const { element, bits } = shared
        const busWidth = bits ? bits[1] - bits[0] + 1 : signalWidth
        const text = refLabel({ name: name + element, bits })
        edges.push({
          id: `e${edges.length}`,
          net: name,
          source: source.portId,
          target: target.portId,
          busWidth,
          signalClass,
          label: labelled.has(text) ? null : busWidth > 1 && !bits ? `${text} [${busWidth}]` : text,
        })
        labelled.add(text)
      }
    }
  }

  return { nodes, edges }
}

/**
 * Size a box node and fix its port positions: inputs on the left, outputs on the
 * right, inouts along the bottom, with names drawn inside the box.
 */
function boxGeometry(
  id: string,
  [title, subtitle]: [string, string],
  pins: { name: string; direction: Direction }[],
  clocks: Set<string>,
) {
  const west = pins.filter((p) => p.direction === 'input')
  const east = pins.filter((p) => p.direction === 'output')
  const south = pins.filter((p) => p.direction === 'inout')

  const longest = (list: typeof pins) => Math.max(0, ...list.map((p) => textWidth(p.name)))
  const width = Math.ceil(
    Math.max(
      110,
      textWidth(title) * 1.1 + 24,
      textWidth(subtitle) + 24,
      longest(west) + longest(east) + 36,
      (south.length + 1) * 40,
    ),
  )
  const rows = Math.max(west.length, east.length, 1)
  const height = HEADER_HEIGHT + rows * PORT_PITCH + (south.length ? 20 : 6)

  const pinY = (i: number) => HEADER_HEIGHT + i * PORT_PITCH + PORT_PITCH / 2
  // Block ports are namespaced by direction, since one block may read and write the same signal.
  const portId = (p: { name: string; direction: Direction }) =>
    id.startsWith('blk:') ? `${id}:${p.direction === 'input' ? 'in' : 'out'}:${p.name}` : `${id}:${p.name}`

  const ports: SchematicPort[] = [
    ...west.map((p, i) => ({ id: portId(p), name: p.name, side: 'WEST' as const, x: 0, y: pinY(i), clock: clocks.has(p.name) })),
    ...east.map((p, i) => ({ id: portId(p), name: p.name, side: 'EAST' as const, x: width, y: pinY(i), clock: false })),
    ...south.map((p, i) => ({
      id: portId(p),
      name: p.name,
      side: 'SOUTH' as const,
      x: ((i + 1) * width) / (south.length + 1),
      y: height,
      clock: false,
    })),
  ]
  return { width, height, ports }
}

export const instanceSubtitle = (module: string, type: ModuleType) => `${module} · ${MODULE_TYPE_LABELS[type]}`

function classifySignal(name: string, drivesClockPin: boolean): SignalClass {
  const lower = name.toLowerCase()
  if (drivesClockPin || /(^|_)(clk|clock)(_|$|\d)/.test(lower)) return 'clock'
  if (/(^|_)(rst|reset)(_n|n|_|$)/.test(lower)) return 'reset'
  return 'data'
}
