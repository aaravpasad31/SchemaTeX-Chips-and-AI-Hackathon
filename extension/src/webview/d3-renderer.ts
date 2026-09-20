/**
 * D3.js renderer for SchemaTeX diagrams.
 * Integrates D3.js for rendering ELK layout output with interactive zoom and pan behaviors.
 *
 * Ready for T4-T8 to implement actual rendering logic:
 * - T4: Render hierarchical module boxes
 * - T5: Render port nodes (input/output/inout)
 * - T6: Render signal edges with routing
 * - T7: Add labels and annotations
 * - T8: Implement styling and appearance
 */

import * as d3 from 'd3';
import { ElkGraph } from './types/layout';

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

		// Add defs for gradients and markers (ready for T4-T8)
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
	}

	/**
	 * Render an ELK graph using D3.js
	 * Currently a stub implementation - T4-T8 will add full rendering
	 *
	 * @param graph - ELK graph structure from layout engine
	 */
	public render(graph: ElkGraph): void {
		if (!this.svg || !this.g) {
			throw new Error('D3Renderer not initialized. Call initialize() first');
		}

		this.currentGraph = graph;

		// Stub: Currently just clears previous render
		// T4-T8 will implement:
		// - Render hierarchical containers (T4)
		// - Render port nodes (T5)
		// - Render signal edges (T6)
		// - Add labels and annotations (T7)
		// - Apply styling (T8)

		console.log('D3Renderer.render() called with graph:', graph);
		console.log('Ready for T4-T8 rendering implementation');

		// Clear previous nodes and edges
		this.nodeMap.clear();
		this.edgeMap.clear();
		this.g.selectAll('.d3-node').remove();
		this.g.selectAll('.d3-edge').remove();
		this.g.selectAll('.d3-label').remove();

		// TODO: Implement rendering in T4-T8
		// For now, render a placeholder indicating the canvas is ready
		this.renderPlaceholder();
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
	 * Render a placeholder to indicate canvas is ready
	 * This will be replaced by actual rendering in T4-T8
	 */
	private renderPlaceholder(): void {
		if (!this.g) {
			return;
		}

		// Draw a simple rectangle and circle to show D3 is working
		const placeholderGroup = this.g.append('g')
			.attr('class', 'd3-placeholder');

		// Rectangle
		placeholderGroup.append('rect')
			.attr('x', 50)
			.attr('y', 50)
			.attr('width', 200)
			.attr('height', 100)
			.attr('fill', '#667eea')
			.attr('stroke', '#5568d3')
			.attr('stroke-width', 2)
			.attr('rx', 4);

		// Circle
		placeholderGroup.append('circle')
			.attr('cx', 450)
			.attr('cy', 100)
			.attr('r', 40)
			.attr('fill', '#FF6B6B')
			.attr('stroke', '#FF5252')
			.attr('stroke-width', 2);

		// Labels
		placeholderGroup.append('text')
			.attr('x', 150)
			.attr('y', 105)
			.attr('text-anchor', 'middle')
			.attr('fill', 'white')
			.attr('font-family', 'monospace')
			.attr('font-size', 12)
			.text('D3 Canvas Ready');

		placeholderGroup.append('text')
			.attr('x', 450)
			.attr('y', 105)
			.attr('text-anchor', 'middle')
			.attr('fill', 'white')
			.attr('font-family', 'monospace')
			.attr('font-size', 12)
			.text('T4-T8');

		// Note about T4-T8
		this.g.append('text')
			.attr('x', 10)
			.attr('y', 300)
			.attr('fill', '#999')
			.attr('font-family', 'monospace')
			.attr('font-size', 11)
			.text('T4: Module hierarchy | T5: Ports | T6: Edges | T7: Labels | T8: Styling');
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
