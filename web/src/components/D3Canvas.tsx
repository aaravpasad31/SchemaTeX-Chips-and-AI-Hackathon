import { useEffect, useRef } from 'react'
// @ts-ignore
import * as d3 from 'd3'

interface D3CanvasProps {
  graph: any
}

export default function D3Canvas({ graph }: D3CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!graph || !containerRef.current) return
    renderCleanDiagram(graph)
  }, [graph])

  const renderCleanDiagram = (graph: any) => {
    try {
      console.log('[D3Canvas] [DEBUG-1a1f] Starting render', { childrenCount: graph?.children?.length })
      if (!graph || !graph.children) {
        console.log('[D3Canvas] [DEBUG-1a1f] No graph or children')
        return
      }

      const container = containerRef.current
      if (!container) {
        console.log('[D3Canvas] [DEBUG-1a1f] No container ref')
        return
      }

      const width = container.clientWidth || 1200
      const height = container.clientHeight || 700

      console.log('[D3Canvas] [DEBUG-1a1f] Container dimensions', { width, height })
      d3.select(container).selectAll('svg').remove()
      console.log('[D3Canvas] [DEBUG-1a1f] Cleared old SVG')

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', '#f9f9f9')

    const g = svg.append('g')

    // Categorize nodes
    const portNodes: any[] = []
    const blockNodes: any[] = []
    const containerNodes: any[] = []

    if (graph.children && graph.children.length > 0) {
      graph.children.forEach((node: any) => {
        const nodeType = node.properties?.nodeType || node.type
        if (nodeType === 'port') {
          portNodes.push(node)
        } else if (nodeType === 'hierarchical_container') {
          containerNodes.push(node)
        } else {
          blockNodes.push(node)
        }
      })
    }

    // If no blockNodes, create one from the main module (for simple modules)
    if (blockNodes.length === 0 && graph.label) {
      blockNodes.push({
        id: 'main_module',
        label: graph.label,
        x: 300,
        y: 300,
        width: 140,
        height: 100,
        ports: portNodes,  // Use the extracted portNodes
      })
    }

    const detectSignalType = (portName: string): string => {
      const name = (portName || '').toLowerCase()
      if (name.includes('clk') || name.includes('clock')) return 'clock'
      if (name.includes('reset') || name.includes('rst')) return 'reset'
      if (name.includes('vcc') || name.includes('vdd') || name.includes('gnd')) return 'power'
      return 'data'
    }

    const getPortColor = (signalType: string) => {
      const colors: Record<string, string> = {
        clock: '#2196F3',
        reset: '#FF5252',
        data: '#666',
        power: '#FFC107',
      }
      return colors[signalType] || '#888'
    }

    // Render blocks first
    blockNodes.forEach((node: any) => {
      const x = node.x || 300
      const y = node.y || 300
      const boxWidth = 140
      const boxHeight = 100

      const nodeGroup = g.append('g')
        .attr('class', 'd3-node-group')
        .attr('data-node-id', node.id)

      // Check if this is a mux (multiplexer) - draw as trapezoid
      const isMux = (node.label || node.id).toLowerCase().includes('mux')

      if (isMux) {
        // Draw trapezoid for mux (narrower top, wider bottom with angled sides)
        const topWidth = boxWidth * 0.60    // Top edge narrower
        const botWidth = boxWidth           // Bottom edge wider
        const trapPoints = [
          [x - topWidth / 2, y - boxHeight / 2],      // top-left
          [x + topWidth / 2, y - boxHeight / 2],      // top-right
          [x + botWidth / 2, y + boxHeight / 2],      // bottom-right (angled)
          [x - botWidth / 2, y + boxHeight / 2],      // bottom-left (angled)
        ]
        const trapPath = trapPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z'

        nodeGroup.append('path')
          .attr('d', trapPath)
          .attr('fill', '#ffffff')
          .attr('stroke', '#333333')
          .attr('stroke-width', 2)
          .attr('stroke-linejoin', 'miter')
      } else {
        // Sharp rectangle for regular modules
        nodeGroup.append('rect')
          .attr('x', x - boxWidth / 2)
          .attr('y', y - boxHeight / 2)
          .attr('width', boxWidth)
          .attr('height', boxHeight)
          .attr('fill', '#ffffff')
          .attr('stroke', '#333333')
          .attr('stroke-width', 2)
      }

      // Module label
      nodeGroup.append('text')
        .attr('x', x)
        .attr('y', y - 10)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', '#000000')
        .text(node.label || node.id)
        .style('pointer-events', 'none')

      // Get ports for this module - from either node.ports or portNodes
      const nodePorts = node.ports || portNodes
      const inputPorts = nodePorts.filter((p: any) => p.direction === 'input' || p.properties?.direction === 'input')
      const outputPorts = nodePorts.filter((p: any) => p.direction === 'output' || p.properties?.direction === 'output')

      // For mux, separate select signals from regular inputs
      const selectSignals = inputPorts.filter((p: any) => (p.name || '').toLowerCase().includes('sel'))

      // Draw input ports on left edge (exclude selects for mux)
      const inputsToRender = inputPorts
      inputsToRender.forEach((port: any, idx: number) => {
        // Skip select signals for mux - they go on bottom
        if (isMux && (port.name || '').toLowerCase().includes('sel')) return
        const totalInputs = inputsToRender.length
        const portY = y - boxHeight / 2 + ((idx + 1) / (totalInputs + 1)) * boxHeight
        const portX = x - boxWidth / 2
        const lineEndX = portX - 20

        // Port line
        nodeGroup.append('line')
          .attr('x1', portX)
          .attr('y1', portY)
          .attr('x2', lineEndX)
          .attr('y2', portY)
          .attr('stroke', getPortColor(detectSignalType(port.name)))
          .attr('stroke-width', 2)

        // Port label
        const portLabel = port.name || port.label || ''
        if (portLabel) {
          nodeGroup.append('text')
            .attr('x', lineEndX - 8)
            .attr('y', portY + 3)
            .attr('text-anchor', 'end')
            .attr('font-size', '11px')
            .attr('fill', '#000000')
            .attr('font-weight', '600')
            .text(portLabel)
            .style('pointer-events', 'none')
        }
      })

      // Draw output ports on right edge
      outputPorts.forEach((port: any, idx: number) => {
        const totalOutputs = outputPorts.length
        const portY = y - boxHeight / 2 + ((idx + 1) / (totalOutputs + 1)) * boxHeight
        const portX = x + boxWidth / 2
        const lineEndX = portX + 20

        // Port line
        nodeGroup.append('line')
          .attr('x1', portX)
          .attr('y1', portY)
          .attr('x2', lineEndX)
          .attr('y2', portY)
          .attr('stroke', getPortColor(detectSignalType(port.name)))
          .attr('stroke-width', 2)

        // Port label
        const portLabel = port.name || port.label || ''
        if (portLabel) {
          nodeGroup.append('text')
            .attr('x', lineEndX + 8)
            .attr('y', portY + 3)
            .attr('text-anchor', 'start')
            .attr('font-size', '11px')
            .attr('fill', '#000000')
            .attr('font-weight', '600')
            .text(portLabel)
            .style('pointer-events', 'none')
        }
      })

      // Draw select signals at bottom for mux
      if (isMux && selectSignals.length > 0) {
        selectSignals.forEach((port: any, idx: number) => {
          const totalSelects = selectSignals.length
          const portX = x - boxWidth / 4 + (idx * boxWidth / 2) / totalSelects
          const portY = y + boxHeight / 2
          const lineEndY = portY + 20

          // Port line
          nodeGroup.append('line')
            .attr('x1', portX)
            .attr('y1', portY)
            .attr('x2', portX)
            .attr('y2', lineEndY)
            .attr('stroke', getPortColor(detectSignalType(port.name)))
            .attr('stroke-width', 2)

          // Port label
          nodeGroup.append('text')
            .attr('x', portX)
            .attr('y', lineEndY + 12)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#333333')
            .attr('font-weight', '500')
            .text(port.name || '')
            .style('pointer-events', 'none')
        })
      }
    })

    // Render containers
    containerNodes.forEach((container: any) => {
      const x = container.x || 0
      const y = container.y || 0
      const w = container.width || 500
      const h = container.height || 350

      const containerGroup = g.append('g')
        .attr('class', 'd3-container-group')
        .attr('data-node-id', container.id)

      // Container box (sharp corners)
      containerGroup.append('rect')
        .attr('x', x - w / 2)
        .attr('y', y - h / 2)
        .attr('width', w)
        .attr('height', h)
        .attr('fill', '#fafafa')
        .attr('stroke', '#000000')
        .attr('stroke-width', 2)

      // Container label
      containerGroup.append('text')
        .attr('x', x - w / 2 + 8)
        .attr('y', y - h / 2 + 18)
        .attr('font-weight', 'bold')
        .attr('font-size', '13px')
        .attr('fill', '#000000')
        .text(container.label || container.id)
        .style('pointer-events', 'none')

      // Render ports on container edges
      if (container.properties?.ports && container.properties.ports.length > 0) {
        const allPorts = container.properties.ports
        const leftPorts = allPorts.filter((p: any) => p.direction === 'input')
        const rightPorts = allPorts.filter((p: any) => p.direction === 'output')

        // Left ports
        leftPorts.forEach((port: any, idx: number) => {
          const portY = y - h / 2 + ((idx + 1) / (leftPorts.length + 1)) * h
          const portX = x - w / 2
          const lineStartX = portX - 15

          containerGroup.append('line')
            .attr('x1', portX)
            .attr('y1', portY)
            .attr('x2', lineStartX)
            .attr('y2', portY)
            .attr('stroke', getPortColor(detectSignalType(port.name)))
            .attr('stroke-width', 2)

          containerGroup.append('text')
            .attr('x', lineStartX - 5)
            .attr('y', portY)
            .attr('text-anchor', 'end')
            .attr('dy', '0.3em')
            .attr('font-size', '9px')
            .attr('fill', '#333333')
            .text(port.name || '')
            .style('pointer-events', 'none')
        })

        // Right ports
        rightPorts.forEach((port: any, idx: number) => {
          const portY = y - h / 2 + ((idx + 1) / (rightPorts.length + 1)) * h
          const portX = x + w / 2
          const lineEndX = portX + 15

          containerGroup.append('line')
            .attr('x1', portX)
            .attr('y1', portY)
            .attr('x2', lineEndX)
            .attr('y2', portY)
            .attr('stroke', getPortColor(detectSignalType(port.name)))
            .attr('stroke-width', 2)

          containerGroup.append('text')
            .attr('x', lineEndX + 5)
            .attr('y', portY)
            .attr('text-anchor', 'start')
            .attr('dy', '0.3em')
            .attr('font-size', '9px')
            .attr('fill', '#333333')
            .text(port.name || '')
            .style('pointer-events', 'none')
        })
      }

      // Render children instances
      if (container.children && container.children.length > 0) {
        const childrenGroup = containerGroup.append('g')
          .attr('transform', `translate(${x}, ${y})`)

        const numChildren = container.children.length
        const cols = Math.max(1, Math.ceil(Math.sqrt(numChildren)))
        const rows = Math.ceil(numChildren / cols)

        container.children.forEach((child: any, idx: number) => {
          const col = idx % cols
          const row = Math.floor(idx / cols)
          const cellWidth = (w - 40) / cols
          const cellHeight = (h - 80) / rows

          const instX = -w / 2 + 20 + col * cellWidth + cellWidth / 2
          const instY = -h / 2 + 80 + row * cellHeight + cellHeight / 2
          const instWidth = 100
          const instHeight = 60

          const instGroup = childrenGroup.append('g')
            .attr('transform', `translate(${instX}, ${instY})`)

          // Instance box (sharp corners)
          instGroup.append('rect')
            .attr('x', -instWidth / 2)
            .attr('y', -instHeight / 2)
            .attr('width', instWidth)
            .attr('height', instHeight)
            .attr('fill', '#e3f2fd')
            .attr('stroke', '#1976d2')
            .attr('stroke-width', 1.5)

          // Instance label - VISIBLE AND BOLD
          instGroup.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.3em')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', '#0d47a1')
            .text(child.label || child.id || `inst_${idx}`)
            .style('pointer-events', 'none')
        })
      }
    })

    // Render edges (connections)
    if (graph.edges && graph.edges.length > 0) {
      const nodePositions: Record<string, { x: number; y: number }> = {}
      ;[...blockNodes, ...containerNodes, ...portNodes].forEach((node: any) => {
        nodePositions[node.id] = { x: node.x || 0, y: node.y || 0 }
        // Also include nested instance nodes from hierarchical containers
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((child: any) => {
            nodePositions[child.id] = { x: child.x || 0, y: child.y || 0 }
          })
        }
      })

      // Group edges by target to offset them
      const edgesByTarget: Record<string, any[]> = {}
      graph.edges.forEach((edge: any) => {
        const targetId = edge.targets?.[0] || edge.target
        if (!edgesByTarget[targetId]) {
          edgesByTarget[targetId] = []
        }
        edgesByTarget[targetId].push(edge)
      })

      graph.edges.forEach((edge: any, edgeIndex: number) => {
        const sourceId = edge.sources?.[0] || edge.source
        const targetId = edge.targets?.[0] || edge.target

        const sourcePos = nodePositions[sourceId]
        const targetPos = nodePositions[targetId]

        if (sourcePos && targetPos) {
          // Offset control point based on edge index to fan out arrows
          const edgesAtTarget = edgesByTarget[targetId]
          const edgeCount = edgesAtTarget.length
          const edgeOffset = edgeIndex < edgeCount ? (edgeIndex - edgeCount / 2) * 20 : 0

          const midX = (sourcePos.x + targetPos.x) / 2 + edgeOffset
          const midY = (sourcePos.y + targetPos.y) / 2 + 40

          const pathData = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY} ${targetPos.x} ${targetPos.y}`

          const signalType = edge.properties?.signalType || 'data'
          const strokeColor = getPortColor(signalType)

          g.append('path')
            .attr('d', pathData)
            .attr('fill', 'none')
            .attr('stroke', strokeColor)
            .attr('stroke-width', 2)
            .attr('opacity', 0.6)

          if (edge.label) {
            g.append('text')
              .attr('x', midX)
              .attr('y', midY - 8)
              .attr('text-anchor', 'middle')
              .attr('font-size', '9px')
              .attr('fill', '#555555')
              .attr('background', '#ffffff')
              .text(edge.label)
              .style('pointer-events', 'none')
          }
        }
      })
    }

    // Add zoom
    try {
      const zoom = d3.zoom().on('zoom', (event: any) => {
        g.attr('transform', event.transform)
      })

      svg.call(zoom as any)

      // Fit to view
      const allNodes = [...blockNodes, ...containerNodes, ...portNodes]
      if (allNodes.length > 0) {
        const validNodes = allNodes.filter((n: any) => n.x !== undefined && n.y !== undefined)
        if (validNodes.length > 0) {
          const xs = validNodes.map((n: any) => n.x || 0).filter((x: number) => isFinite(x))
          const ys = validNodes.map((n: any) => n.y || 0).filter((y: number) => isFinite(y))

          if (xs.length > 0 && ys.length > 0) {
            const minX = Math.min(...xs)
            const maxX = Math.max(...xs)
            const minY = Math.min(...ys)
            const maxY = Math.max(...ys)

            const rangeX = Math.max(maxX - minX, 100)
            const rangeY = Math.max(maxY - minY, 100)
            const midX = minX + rangeX / 2
            const midY = minY + rangeY / 2

            const scale = Math.min(width / (rangeX + 200), height / (rangeY + 200), 1.5)
            const tx = width / 2 - midX * scale
            const ty = height / 2 - midY * scale

            svg.call(
              zoom.transform as any,
              d3.zoomIdentity.translate(tx, ty).scale(scale)
            )
          }
        }
      }
    } catch (err) {
      console.error('[D3Canvas] [DEBUG-1a1f] Zoom error:', err)
    }
    } catch (err) {
      console.error('[D3Canvas] [DEBUG-1a1f] Render error:', err)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#f9f9f9',
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
      }}
    />
  )
}
