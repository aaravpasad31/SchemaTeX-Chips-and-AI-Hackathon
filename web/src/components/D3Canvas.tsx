import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { HEADER_HEIGHT, instanceSubtitle, type SignalClass } from '../lib/graph'
import type { Layout, PlacedEdge, PlacedNode } from '../lib/layout'

interface D3CanvasProps {
  layout: Layout
  selectedNet: string | null
  onSelectNet: (net: string | null) => void
  onOpenInstance: (index: number) => void
}

const WIRE_COLORS: Record<SignalClass, string> = {
  clock: '#2563eb',
  reset: '#dc2626',
  data: '#334155',
}

const FONT = 'var(--font-geist-mono), ui-monospace, Menlo, monospace'

type Callbacks = { current: Pick<D3CanvasProps, 'onSelectNet' | 'onOpenInstance'> }

export default function D3Canvas({ layout, selectedNet, onSelectNet, onOpenInstance }: D3CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Keep callbacks current without re-rendering the whole diagram when they change.
  const callbacks = useRef({ onSelectNet, onOpenInstance })
  callbacks.current = { onSelectNet, onOpenInstance }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const svg = renderSchematic(container, layout, callbacks)
    svgRef.current = svg.node()
    return () => {
      svg.remove()
    }
  }, [layout])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const root = d3.select(svg)
    root.classed('has-selection', selectedNet !== null)
    root.selectAll<SVGGElement, PlacedEdge>('g.wire').classed('selected', (e) => e.net === selectedNet)
  }, [selectedNet, layout])

  return <div ref={containerRef} className="schematic relative h-full w-full overflow-hidden bg-white" />
}

function renderSchematic(
  container: HTMLDivElement,
  layout: Layout,
  callbacks: Callbacks,
) {
  const width = container.clientWidth || 1000
  const height = container.clientHeight || 700

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('font-family', FONT)
    .on('click', () => callbacks.current.onSelectNet(null))

  const defs = svg.append('defs')
  defs
    .append('pattern')
    .attr('id', 'memory-hatch')
    .attr('width', 8)
    .attr('height', 8)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(45)')
    .call((p) => p.append('rect').attr('width', 8).attr('height', 8).attr('fill', '#eff6ff'))
    .call((p) => p.append('line').attr('y2', 8).attr('stroke', '#bfdbfe').attr('stroke-width', 2))

  const viewport = svg.append('g')

  // Pin names belong to the child module; clicking one selects the parent net wired to it.
  const portNets = new Map<string, string>()
  for (const e of layout.edges) {
    portNets.set(e.source, e.net)
    portNets.set(e.target, e.net)
  }
  const selectPort = (event: MouseEvent, portId: string) => {
    event.stopPropagation()
    callbacks.current.onSelectNet(portNets.get(portId) ?? null)
  }

  // Wires first so that boxes sit on top of their port stubs.
  const wires = viewport
    .append('g')
    .selectAll<SVGGElement, PlacedEdge>('g.wire')
    .data(layout.edges.filter((e) => e.points.length >= 2))
    .join('g')
    .attr('class', 'wire')
    .style('cursor', 'pointer')
    .on('click', (event, e) => {
      event.stopPropagation()
      callbacks.current.onSelectNet(e.net)
    })

  const path = (e: PlacedEdge) => d3.line<{ x: number; y: number }>((p) => p.x, (p) => p.y)(e.points)
  // Wide invisible stroke makes thin wires easy to click.
  wires.append('path').attr('d', path).attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 10)
  wires
    .append('path')
    .attr('class', 'wire-line')
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', (e) => WIRE_COLORS[e.signalClass])
    .attr('stroke-width', (e) => (e.busWidth > 1 ? 2.25 : 1.25))
  wires
    .filter((e) => e.label !== null && e.labelPos !== null)
    .append('text')
    .attr('x', (e) => e.labelPos!.x)
    .attr('y', (e) => e.labelPos!.y)
    .attr('font-size', 10)
    .attr('fill', (e) => WIRE_COLORS[e.signalClass])
    .attr('paint-order', 'stroke')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 3)
    .text((e) => e.label!)
  wires.append('title').text((e) => (e.busWidth > 1 ? `${e.net} [${e.busWidth} bits]` : e.net))

  const nodes = viewport
    .append('g')
    .selectAll<SVGGElement, PlacedNode>('g.node')
    .data(layout.nodes)
    .join('g')
    .attr('class', 'node')
    .attr('transform', (n) => `translate(${n.x},${n.y})`)

  nodes.filter((n) => n.kind === 'boundary').each(function (n) {
    drawBoundary(d3.select(this), n as Extract<PlacedNode, { kind: 'boundary' }>, selectPort)
  })
  nodes.filter((n) => n.kind !== 'boundary').each(function (n) {
    drawBox(d3.select(this), n as Exclude<PlacedNode, { kind: 'boundary' }>, selectPort, callbacks)
  })

  // Pan and zoom, starting with the whole diagram in view.
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => viewport.attr('transform', event.transform))
  svg.call(zoom).on('dblclick.zoom', null)

  const scale = Math.min(width / (layout.width || 1), height / (layout.height || 1), 1.25) * 0.95
  svg.call(
    zoom.transform,
    d3.zoomIdentity
      .translate((width - layout.width * scale) / 2, (height - layout.height * scale) / 2)
      .scale(scale),
  )

  return svg
}

function drawBoundary(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  n: Extract<PlacedNode, { kind: 'boundary' }>,
  selectPort: (event: MouseEvent, portId: string) => void,
) {
  const { width: w, height: h } = n
  const tip = 10
  // Arrow-shaped port symbols: inputs and outputs point right, inouts point both ways.
  const shape =
    n.direction === 'inout'
      ? [[tip, 0], [w - tip, 0], [w, h / 2], [w - tip, h], [tip, h], [0, h / 2]]
      : [[0, 0], [w - tip, 0], [w, h / 2], [w - tip, h], [0, h]]

  g.style('cursor', 'pointer').on('click', (event) => selectPort(event, n.ports[0].id))
  g.append('polygon')
    .attr('points', shape.map((p) => p.join(',')).join(' '))
    .attr('fill', n.direction === 'input' ? '#ecfdf5' : n.direction === 'output' ? '#fef2f2' : '#f1f5f9')
    .attr('stroke', n.direction === 'input' ? '#059669' : n.direction === 'output' ? '#dc2626' : '#64748b')
    .attr('stroke-width', 1.25)
  g.append('text')
    .attr('x', (w - (n.direction === 'inout' ? 0 : tip)) / 2)
    .attr('y', h / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('fill', '#0f172a')
    .text(n.label)
  g.append('title').text(`${n.direction} ${n.label}`)
}

function drawBox(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  n: Exclude<PlacedNode, { kind: 'boundary' }>,
  selectPort: (event: MouseEvent, portId: string) => void,
  callbacks: Callbacks,
) {
  const isInstance = n.kind === 'instance'
  const fill = !isInstance
    ? n.blockKind === 'always_ff' || n.blockKind === 'always_latch'
      ? '#fffbeb'
      : '#f8fafc'
    : n.moduleType === 'memory'
      ? 'url(#memory-hatch)'
      : '#eff6ff'
  const stroke = isInstance ? '#1d4ed8' : n.blockKind === 'always_ff' ? '#b45309' : '#475569'

  g.append('rect')
    .attr('width', n.width)
    .attr('height', n.height)
    .attr('rx', isInstance && n.moduleType === 'fsm' ? 10 : 2)
    .attr('fill', fill)
    .attr('stroke', stroke)
    .attr('stroke-width', isInstance ? 1.75 : 1.25)
  g.append('line')
    .attr('x1', 0)
    .attr('x2', n.width)
    .attr('y1', HEADER_HEIGHT - 4)
    .attr('y2', HEADER_HEIGHT - 4)
    .attr('stroke', stroke)
    .attr('stroke-opacity', 0.25)

  g.append('text')
    .attr('x', n.width / 2)
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .attr('font-weight', 700)
    .attr('fill', isInstance ? '#1e3a8a' : '#0f172a')
    .text(n.label)
  g.append('text')
    .attr('x', n.width / 2)
    .attr('y', 28)
    .attr('text-anchor', 'middle')
    .attr('font-size', 10)
    .attr('fill', '#64748b')
    .text(isInstance ? instanceSubtitle(n.module, n.moduleType) : `line ${n.line}`)

  if (isInstance) {
    g.style('cursor', 'zoom-in').on('dblclick', (event) => {
      event.stopPropagation()
      callbacks.current.onOpenInstance(n.index)
    })
    g.append('title').text(`${n.label} (${n.module})\nDouble-click to open`)
  } else {
    g.append('title').text(`${n.label} at line ${n.line}`)
  }

  const pins = g
    .selectAll('g.pin')
    .data(n.ports)
    .join('g')
    .attr('class', 'pin')
    .style('cursor', 'pointer')
    .on('click', (event, p) => selectPort(event, p.id))
  pins
    .append('text')
    .attr('x', (p) => (p.side === 'WEST' ? (p.clock ? 14 : 6) : p.side === 'EAST' ? p.x - 6 : p.x))
    .attr('y', (p) => (p.side === 'SOUTH' ? p.y - 6 : p.y))
    .attr('dy', '0.35em')
    .attr('text-anchor', (p) => (p.side === 'WEST' ? 'start' : p.side === 'EAST' ? 'end' : 'middle'))
    .attr('font-size', 10)
    .attr('fill', '#334155')
    .text((p) => p.name)
  // Clock inputs get the standard triangle marker.
  pins
    .filter((p) => p.clock)
    .append('path')
    .attr('d', (p) => `M0,${p.y - 5} L8,${p.y} L0,${p.y + 5}`)
    .attr('fill', 'none')
    .attr('stroke', WIRE_COLORS.clock)
    .attr('stroke-width', 1.25)
}
