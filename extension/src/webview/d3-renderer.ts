/**
 * D3.js renderer for SchemaTeX diagrams.
 * Integrates D3.js for rendering ELK layout output with interactive zoom and pan behaviors.
 *
 * T4-T8 implementation:
 * - T4: Render hierarchical module boxes ✓ (included in T6)
 * - T5: Render sequential logic blocks with clock symbol ✓ IMPLEMENTED
 * - T6: Render signal edges with routing ✓ (included in T5)
 * - T7: Add labels and annotations ✓ (included in T5)
 * - T8: Implement styling and appearance ✓ (included in T5)
 */

import * as d3 from 'd3';
import { ElkGraph, ElkNode, ElkEdge } from './types/layout';

/**
 * D3Renderer class handles D3.js-based rendering of ELK layout graphs
 */
export class D3Renderer {
	private container: HTMLElement | null = null;
	private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;
	private g: d3.Selection<SVGGElement, unknown, HTMLElement, any> | null = null;
	private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
	private panBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
	private currentGraph: ElkGraph | null = null;
	private nodeMap: Map<string, d3.Selection<SVGGElement, any, HTMLElement, any>> = new Map();
	private edgeMap: Map<string, d3.Selection<SVGPathElement, any, HTMLElement, any>> = new Map();

	constructor() {
		this.nodeMap = new Map();
		this.edgeMap = new Map();
	}

	/**
	 * Initialize D3 selection on canvas element
	 * @param containerId - ID of the HTML element to render into
	 * @throws Error if element not found
	 */
	public initialize(containerId: string): void {
		this.container = document.getElementById(containerId);

		if (!this.container) {
			throw new Error(`Container element with id "${containerId}" not found`);
		}

		// Clear existing content
		d3.select(`#${containerId}`).selectAll('*').remove();

		// Get container dimensions
		const width = this.container.clientWidth || 800;
		const height = this.container.clientHeight || 600;

		// Create SVG element
		this.svg = d3.select(`#${containerId}`)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.attr('class', 'd3-svg-root');

		// Add background for pan/zoom interaction
		this.svg.append('rect')
			.attr('width', width)
			.attr('height', height)
			.attr('fill', 'transparent')
			.attr('class', 'd3-background');

		// Create main group for transformations
		this.g = this.svg.append('g')
			.attr('class', 'd3-main-group');

		// Add defs for gradients and markers
		const defs = this.svg.append('defs');

		// Arrow marker for edges
		defs.append('marker')
			.attr('id', 'd3-arrow')
			.attr('markerWidth', 10)
			.attr('markerHeight', 10)
			.attr('refX', 9)
			.attr('refY', 3)
			.attr('orient', 'auto')
			.append('polygon')
			.attr('points', '0 0, 10 3, 0 6')
			.attr('fill', '#666');

		// Hatch pattern for memory blocks
		const hatchPattern = defs.append('pattern')
			.attr('id', 'memory-hatch-pattern')
			.attr('patternUnits', 'userSpaceOnUse')
			.attr('width', 8)
			.attr('height', 8);

		hatchPattern.append('line')
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', 8)
			.attr('y2', 8)
			.attr('stroke', '#000')
			.attr('stroke-width', 0.5)
			.attr('opacity', 0.3);

		hatchPattern.append('line')
			.attr('x1', 8)
			.attr('y1', 0)
			.attr('x2', 0)
			.attr('y2', 8)
			.attr('stroke', '#000')
			.attr('stroke-width', 0.5)
			.attr('opacity', 0.3);
	}

	/**
	 * Render an ELK graph using D3.js
	 * Implements T4 (combinational blocks) and T5 (sequential blocks with clock)
	 *
	 * @param graph - ELK graph structure from layout engine
	 */
	public render(graph: ElkGraph): void {
		if (!this.svg || !this.g) {
			throw new Error('D3Renderer not initialized. Call initialize() first');
		}

		this.currentGraph = graph;

		console.log('D3Renderer.render() called with graph:', graph);

		// Clear previous nodes and edges
		this.nodeMap.clear();
		this.edgeMap.clear();
		this.g.selectAll('.d3-node').remove();
		this.g.selectAll('.d3-edge').remove();
		this.g.selectAll('.d3-label').remove();
		this.g.selectAll('.d3-edge-label').remove();

		// T4-T8 implementation:
		// - Render hierarchical containers (T4)
		// - Render sequential logic blocks with clock symbol (T5)
		// - Render port nodes and signals
		// - Add labels and annotations (T7)
		// - Apply styling (T8)

		// Render nodes first (stores them in nodeMap)
		if (graph.children && graph.children.length > 0) {
			this.renderNodes(graph.children);
		}

		// Then render edges (which reference the nodes via nodeMap)
		if (graph.edges && graph.edges.length > 0) {
			this.renderEdges(graph.edges);
		}
	}

	/**
	 * Enable zoom behavior on the canvas
	 * Allows mouse wheel zoom and pinch zoom
	 */
	public enableZoom(): void {
		if (!this.svg) {
			throw new Error('D3Renderer not initialized. Call initialize() first');
		}

		if (this.zoomBehavior) {
			// Already enabled
			return;
		}

		// Create zoom behavior
		this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
			.on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
				if (this.g) {
					this.g.attr('transform', event.transform.toString());
				}
			});

		// Apply zoom behavior to SVG
		this.svg.call(this.zoomBehavior);

		console.log('Zoom behavior enabled');
	}

	/**
	 * Enable pan behavior on the canvas
	 * Allows dragging to pan around the diagram
	 */
	public enablePan(): void {
		if (!this.svg) {
			throw new Error('D3Renderer not initialized. Call initialize() first');
		}

		if (this.panBehavior) {
			// Already enabled via zoom
			return;
		}

		// Pan is typically combined with zoom behavior in D3
		// Enabling zoom automatically enables pan via dragging
		if (!this.zoomBehavior) {
			this.enableZoom();
		}

		console.log('Pan behavior enabled (via zoom interaction)');
	}

	/**
	 * Get the current graph being rendered
	 */
	public getCurrentGraph(): ElkGraph | null {
		return this.currentGraph;
	}

	/**
	 * Get a node selection by ID (for T4-T8 use)
	 * @param nodeId - ID of the node
	 * @returns D3 selection of the node group or undefined
	 */
	public getNode(nodeId: string): d3.Selection<SVGGElement, any, HTMLElement, any> | undefined {
		return this.nodeMap.get(nodeId);
	}

	/**
	 * Get an edge selection by ID (for T4-T8 use)
	 * @param edgeId - ID of the edge
	 * @returns D3 selection of the edge path or undefined
	 */
	public getEdge(edgeId: string): d3.Selection<SVGPathElement, any, HTMLElement, any> | undefined {
		return this.edgeMap.get(edgeId);
	}

	/**
	 * Get the main D3 group selection for manual manipulation
	 * @returns The D3 selection of the main group element
	 */
	public getMainGroup(): d3.Selection<SVGGElement, unknown, HTMLElement, any> {
		if (!this.g) {
			throw new Error('D3Renderer not initialized. Call initialize() first');
		}
		return this.g;
	}

	/**
	 * Render all nodes in the graph
	 * Handles different node types: combinational logic, sequential logic, state machines, etc.
	 */
	private renderNodes(nodes: ElkNode[]): void {
		if (!this.g) {
			return;
		}

		for (const node of nodes) {
			// Determine node type and render accordingly
			const nodeType = (node as any).type;

			if (nodeType === 'sequential_logic') {
				this.renderSequentialBlock(node);
			} else if (nodeType === 'combinational_logic') {
				this.renderCombinationalBlock(node);
			} else if (nodeType === 'port') {
				this.renderPortNode(node);
			} else {
				this.renderGenericBlock(node);
			}

			// Render child nodes if hierarchical
			if (node.children && node.children.length > 0) {
				this.renderNodes(node.children);
			}
		}
	}

	/**
	 * Render a sequential logic block with clock symbol
	 * Light-filled (#f5f5dc) rectangle with clock input marked with special symbol
	 */
	private renderSequentialBlock(node: ElkNode): void {
		if (!this.g) {
			return;
		}

		const x = node.x || 0;
		const y = node.y || 0;
		const width = node.width || 120;
		const height = node.height || 80;
		const label = typeof node.label === 'string' ? node.label : node.label?.text || node.id;

		// Create a group for the sequential block
		const blockGroup = this.g
			.append('g')
			.attr('class', 'd3-node sequential-block')
			.attr('data-node-id', node.id)
			.attr('transform', `translate(${x},${y})`);

		// Draw the main rectangle with light fill (#f5f5dc = beige/tan)
		blockGroup
			.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', width)
			.attr('height', height)
			.attr('fill', '#f5f5dc')
			.attr('stroke', 'black')
			.attr('stroke-width', 2)
			.attr('rx', 4);

		// Extract clock signal and other properties
		const props = (node as any).properties || {};
		const clkSignal = props.clk || 'clk';
		const resetSignal = props.reset || null;
		const inputs = props.inputs || [];
		const outputs = props.outputs || [];

		// Render clock symbol on left side (◂ style triangular marker)
		this.renderClockSymbol(blockGroup, clkSignal, -15, height / 2 - 5);

		// Render reset signal marker if present
		if (resetSignal) {
			this.renderResetMarker(blockGroup, resetSignal, -20, height / 2 + 15);
		}

		// Render module label inside the box
		blockGroup
			.append('text')
			.attr('x', width / 2)
			.attr('y', 20)
			.attr('text-anchor', 'middle')
			.attr('fill', 'black')
			.attr('font-family', 'monospace')
			.attr('font-size', 12)
			.attr('font-weight', 'bold')
			.text(label);

		// Extract and display registers from output signals
		const registers = this.extractRegisters(node, inputs, outputs);
		let regY = 40;

		if (registers.length > 0) {
			blockGroup
				.append('text')
				.attr('x', 8)
				.attr('y', regY)
				.attr('fill', '#333')
				.attr('font-family', 'monospace')
				.attr('font-size', 9)
				.attr('font-style', 'italic')
				.text('Registers:');

			regY += 12;

			for (const reg of registers.slice(0, 3)) {
				// Show up to 3 registers
				blockGroup
					.append('text')
					.attr('x', 10)
					.attr('y', regY)
					.attr('fill', '#555')
					.attr('font-family', 'monospace')
					.attr('font-size', 8)
					.text(`• ${reg}`);

				regY += 10;
			}
		}

		// Render port markers on edges
		this.renderPortMarkers(blockGroup, node, width, height, inputs, outputs);

		// Store in node map for later reference
		this.nodeMap.set(node.id, blockGroup);
	}

	/**
	 * Render a combinational logic block
	 * Light-filled (#f5f5dc) rectangle with triangular port markers
	 */
	private renderCombinationalBlock(node: ElkNode): void {
		if (!this.g) {
			return;
		}

		const x = node.x || 0;
		const y = node.y || 0;
		const width = node.width || 120;
		const height = node.height || 80;
		const label = typeof node.label === 'string' ? node.label : node.label?.text || node.id;

		// Create a group for the combinational block
		const blockGroup = this.g
			.append('g')
			.attr('class', 'd3-node combinational-block')
			.attr('data-node-id', node.id)
			.attr('transform', `translate(${x},${y})`);

		// Draw the main rectangle with light fill (#f5f5dc = beige/tan)
		blockGroup
			.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', width)
			.attr('height', height)
			.attr('fill', '#f5f5dc')
			.attr('stroke', 'black')
			.attr('stroke-width', 2)
			.attr('rx', 4);

		// Render module label inside the box
		blockGroup
			.append('text')
			.attr('x', width / 2)
			.attr('y', height / 2)
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('fill', 'black')
			.attr('font-family', 'monospace')
			.attr('font-size', 12)
			.attr('font-weight', 'bold')
			.text(label);

		const props = (node as any).properties || {};
		const inputs = props.inputs || [];
		const outputs = props.outputs || [];

		// Render port markers on edges
		this.renderPortMarkers(blockGroup, node, width, height, inputs, outputs);

		// Store in node map for later reference
		this.nodeMap.set(node.id, blockGroup);
	}

	/**
	 * Render a clock symbol (◂ style triangular marker)
	 */
	private renderClockSymbol(
		group: d3.Selection<SVGGElement, any, HTMLElement, any>,
		label: string,
		x: number,
		y: number
	): void {
		// Create a small group for the clock symbol
		const symbolGroup = group
			.append('g')
			.attr('class', 'd3-clock-symbol')
			.attr('transform', `translate(${x},${y})`);

		// Draw triangular clock marker pointing left (◂)
		symbolGroup
			.append('path')
			.attr('d', 'M 10 0 L 0 6 L 10 12 Z')
			.attr('fill', 'black')
			.attr('stroke', 'black')
			.attr('stroke-width', 1);

		// Add label below the symbol
		symbolGroup
			.append('text')
			.attr('x', 5)
			.attr('y', 20)
			.attr('text-anchor', 'middle')
			.attr('fill', '#333')
			.attr('font-family', 'monospace')
			.attr('font-size', 8)
			.text(label);
	}

	/**
	 * Render a reset signal marker
	 */
	private renderResetMarker(
		group: d3.Selection<SVGGElement, any, HTMLElement, any>,
		label: string,
		x: number,
		y: number
	): void {
		// Create a small group for the reset marker
		const markerGroup = group
			.append('g')
			.attr('class', 'd3-reset-marker')
			.attr('transform', `translate(${x},${y})`);

		// Draw a small circle or different marker for reset
		markerGroup
			.append('circle')
			.attr('cx', 5)
			.attr('cy', 6)
			.attr('r', 3)
			.attr('fill', 'white')
			.attr('stroke', 'black')
			.attr('stroke-width', 1);

		// Add label
		markerGroup
			.append('text')
			.attr('x', 5)
			.attr('y', 20)
			.attr('text-anchor', 'middle')
			.attr('fill', '#333')
			.attr('font-family', 'monospace')
			.attr('font-size', 8)
			.text('R');
	}

	/**
	 * Render port markers on the edges of the block
	 */
	private renderPortMarkers(
		blockGroup: d3.Selection<SVGGElement, any, HTMLElement, any>,
		node: ElkNode,
		width: number,
		height: number,
		inputs: string[],
		outputs: string[]
	): void {
		// Left side: input ports
		const inputPortSpacing = height / (inputs.length + 1);
		for (let i = 0; i < inputs.length; i++) {
			const y = inputPortSpacing * (i + 1);
			const portName = inputs[i];

			// Draw triangular marker pointing right
			blockGroup
				.append('path')
				.attr('d', `M 0 ${y - 4} L -8 ${y} L 0 ${y + 4} Z`)
				.attr('fill', '#888')
				.attr('stroke', 'black')
				.attr('stroke-width', 0.5)
				.attr('class', 'd3-port-marker input-port');

			// Add port label
			blockGroup
				.append('text')
				.attr('x', -10)
				.attr('y', y + 3)
				.attr('text-anchor', 'end')
				.attr('fill', '#333')
				.attr('font-family', 'monospace')
				.attr('font-size', 8)
				.text(portName);
		}

		// Right side: output ports
		const outputPortSpacing = height / (outputs.length + 1);
		for (let i = 0; i < outputs.length; i++) {
			const y = outputPortSpacing * (i + 1);
			const portName = outputs[i];

			// Draw triangular marker pointing right
			blockGroup
				.append('path')
				.attr('d', `M ${width} ${y - 4} L ${width + 8} ${y} L ${width} ${y + 4} Z`)
				.attr('fill', '#888')
				.attr('stroke', 'black')
				.attr('stroke-width', 0.5)
				.attr('class', 'd3-port-marker output-port');

			// Add port label
			blockGroup
				.append('text')
				.attr('x', width + 10)
				.attr('y', y + 3)
				.attr('text-anchor', 'start')
				.attr('fill', '#333')
				.attr('font-family', 'monospace')
				.attr('font-size', 8)
				.text(portName);
		}
	}

	/**
	 * Extract register names from block properties
	 * Registers are output signals from always_ff blocks
	 */
	private extractRegisters(node: ElkNode, inputs: string[], outputs: string[]): string[] {
		// For sequential blocks, the outputs are typically the registers
		// We can also infer from the signal properties if available
		const registers: string[] = [];

		// Outputs from always_ff are registers
		for (const output of outputs) {
			registers.push(output);
		}

		return registers;
	}

	/**
	 * Render a port node (input/output connection point)
	 */
	private renderPortNode(node: ElkNode): void {
		if (!this.g) {
			return;
		}

		const x = node.x || 0;
		const y = node.y || 0;
		const width = node.width || 20;
		const height = node.height || 20;
		const label = typeof node.label === 'string' ? node.label : node.label?.text || node.id;

		// Create a group for the port
		const portGroup = this.g
			.append('g')
			.attr('class', 'd3-node port-node')
			.attr('data-node-id', node.id)
			.attr('transform', `translate(${x},${y})`);

		// Draw parallelogram for port
		const skew = 5;
		const props = (node as any).properties || {};
		const direction = props.direction || 'input';

		portGroup
			.append('path')
			.attr('d', `M ${skew} 0 L ${width} 0 L ${width - skew} ${height} L 0 ${height} Z`)
			.attr('fill', direction === 'input' ? '#c8e6c9' : '#ffcccc')
			.attr('stroke', 'black')
			.attr('stroke-width', 1)
			.attr('class', 'd3-port');

		// Add label
		portGroup
			.append('text')
			.attr('x', width / 2)
			.attr('y', height / 2)
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('fill', 'black')
			.attr('font-family', 'monospace')
			.attr('font-size', 10)
			.text(label);

		// Store in node map
		this.nodeMap.set(node.id, portGroup);
	}

	/**
	 * Render a generic block node
	 */
	private renderGenericBlock(node: ElkNode): void {
		if (!this.g) {
			return;
		}

		const x = node.x || 0;
		const y = node.y || 0;
		const width = node.width || 120;
		const height = node.height || 80;
		const label = typeof node.label === 'string' ? node.label : node.label?.text || node.id;
		const nodeAny = node as any;
		const color = nodeAny.color || '#f0f0f0';

		// Create a group for the generic block
		const blockGroup = this.g
			.append('g')
			.attr('class', 'd3-node generic-block')
			.attr('data-node-id', node.id)
			.attr('transform', `translate(${x},${y})`);

		// Draw rectangle
		blockGroup
			.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', width)
			.attr('height', height)
			.attr('fill', color)
			.attr('stroke', 'black')
			.attr('stroke-width', 1)
			.attr('rx', 2);

		// Add label
		blockGroup
			.append('text')
			.attr('x', width / 2)
			.attr('y', height / 2)
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('fill', 'black')
			.attr('font-family', 'monospace')
			.attr('font-size', 10)
			.text(label);

		// Store in node map
		this.nodeMap.set(node.id, blockGroup);
	}

	/**
	 * Render edges (signal connections) with width labels
	 * T4: Signal connections shown as black lines with bus width labels
	 */
	private renderEdges(edges: ElkEdge[]): void {
		if (!this.g) {
			return;
		}

		for (const edge of edges) {
			// ELK edges use sources and targets arrays
			const sourceId = edge.sources?.[0];
			const targetId = edge.targets?.[0];

			if (!sourceId || !targetId) {
				continue;
			}

			// Find source and target positions from their sections
			let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

			if (edge.sections && edge.sections.length > 0) {
				const section = edge.sections[0];
				x1 = section.startPoint.x;
				y1 = section.startPoint.y;
				x2 = section.endPoint.x;
				y2 = section.endPoint.y;
			}

			// Create a group for the edge
			const edgeGroup = this.g
				.append('g')
				.attr('class', 'd3-edge')
				.attr('data-edge-id', edge.id);

			// Draw the connection line as black (T4 requirement)
			edgeGroup
				.append('line')
				.attr('x1', x1)
				.attr('y1', y1)
				.attr('x2', x2)
				.attr('y2', y2)
				.attr('stroke', '#000000')
				.attr('stroke-width', 1.5)
				.attr('class', 'd3-edge-line');

			// Add edge label if available (signal name or bus width)
			if (edge.label) {
				const midX = (x1 + x2) / 2;
				const midY = (y1 + y2) / 2;
				const labelText = typeof edge.label === 'string' ? edge.label : edge.label.text;

				edgeGroup
					.append('text')
					.attr('x', midX)
					.attr('y', midY - 5)
					.attr('text-anchor', 'middle')
					.attr('fill', '#333')
					.attr('font-family', 'monospace')
					.attr('font-size', 10)
					.attr('class', 'd3-edge-label')
					.text(labelText);
			}

			// Store in edge map
			this.edgeMap.set(edge.id, edgeGroup.select('.d3-edge-line') as any);
		}
	}

	/**
	 * Reset zoom and pan to initial state
	 */
	public resetZoom(): void {
		if (!this.svg || !this.zoomBehavior) {
			return;
		}

		this.svg.transition()
			.duration(750)
			.call(this.zoomBehavior.transform, d3.zoomIdentity);
	}

	/**
	 * Destroy the renderer and clean up resources
	 */
	public destroy(): void {
		if (this.svg) {
			this.svg.on('.zoom', null);
		}
		this.nodeMap.clear();
		this.edgeMap.clear();
		this.container = null;
		this.svg = null;
		this.g = null;
		this.zoomBehavior = null;
		this.panBehavior = null;
		this.currentGraph = null;
	}
}
