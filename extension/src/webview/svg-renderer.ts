/**
 * SVG Renderer for converting layout data into interactive SVG diagrams.
 * Transforms positioned nodes and edges into visual SVG elements.
 */

import { Layout, LayoutNode, LayoutEdge } from './types/layout';

/**
 * Color scheme for diagram elements
 */
interface ColorScheme {
	portInput: string;
	portOutput: string;
	portInout: string;
	logicBlock: string;
	module: string;
	signal: string;
	text: string;
	edge: string;
}

/**
 * SVG bounds result
 */
export interface SVGBoundsResult {
	width: number;
	height: number;
	viewBox: string;
}

/**
 * SVG Renderer class
 * Converts layout data into interactive SVG diagrams
 */
export class SVGRenderer {
	private colorScheme: ColorScheme;
	private padding = 10;
	private portRadius = 4;
	private lastSVGBounds: SVGBoundsResult | null = null;

	constructor(colorScheme?: Partial<ColorScheme>) {
		this.colorScheme = {
			portInput: '#4CAF50',    // Green
			portOutput: '#F44336',   // Red
			portInout: '#9E9E9E',    // Gray
			logicBlock: '#2196F3',   // Light blue
			module: '#9C27B0',       // Light purple
			signal: '#FF9800',       // Orange
			text: '#FFFFFF',
			edge: '#666666',
			...colorScheme,
		};

		// Add error hatching pattern defs after instantiation
		this.addErrorPatterns();
	}

	/**
	 * Adds SVG pattern definitions for error visualization
	 */
	private addErrorPatterns(): void {
		// This will be added to the SVG defs during render
	}

	/**
	 * Main entry point: render layout to SVG
	 * @param layout - Layout data with positioned nodes and edges
	 * @param container - HTML element to contain the SVG
	 * @returns SVG element
	 */
	render(layout: Layout, container?: HTMLElement): SVGElement {
		const svg = this.createSVGElement(layout.width, layout.height);

		// Store bounds for later retrieval
		this.lastSVGBounds = {
			width: layout.width,
			height: layout.height,
			viewBox: `0 0 ${layout.width} ${layout.height}`,
		};

		// Add defs for markers and patterns
		this.addDefs(svg);

		// Create group for edges (rendered first, so nodes appear on top)
		const edgesGroup = this.createGroup('edges', svg);
		layout.edges.forEach((edge) => {
			this.renderEdge(edge, edgesGroup, layout);
		});

		// Create group for nodes (rendered on top)
		const nodesGroup = this.createGroup('nodes', svg);
		layout.nodes.forEach((node) => {
			this.renderNode(node, nodesGroup);
		});

		// Insert into container if provided
		if (container) {
			container.innerHTML = '';
			container.appendChild(svg);
		}

		return svg;
	}

	/**
	 * Get SVG bounds from the last render
	 * @returns SVG bounds or null if not rendered yet
	 */
	getSVGBounds(): SVGBoundsResult | null {
		return this.lastSVGBounds;
	}

	/**
	 * Create base SVG element
	 */
	private createSVGElement(width: number, height: number): SVGElement {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', String(width));
		svg.setAttribute('height', String(height));
		svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
		svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		svg.classList.add('diagram-svg');

		// Set background color to match VS Code theme
		const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		bgRect.setAttribute('width', String(width));
		bgRect.setAttribute('height', String(height));
		bgRect.setAttribute('fill', 'var(--vscode-editor-background)');
		svg.appendChild(bgRect);

		return svg;
	}

	/**
	 * Create a group element
	 */
	private createGroup(className: string, parent: SVGElement): SVGGElement {
		const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		group.classList.add(className);
		parent.appendChild(group);
		return group;
	}

	/**
	 * Add defs section with markers and patterns
	 */
	private addDefs(svg: SVGElement): void {
		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

		// Arrow marker for edges
		const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
		marker.setAttribute('id', 'arrowhead');
		marker.setAttribute('markerWidth', '10');
		marker.setAttribute('markerHeight', '10');
		marker.setAttribute('refX', '9');
		marker.setAttribute('refY', '3');
		marker.setAttribute('orient', 'auto');

		const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		polygon.setAttribute('points', '0 0, 10 3, 0 6');
		polygon.setAttribute('fill', this.colorScheme.edge);
		marker.appendChild(polygon);
		defs.appendChild(marker);

		// Error hatching pattern
		const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
		pattern.setAttribute('id', 'error-hatch');
		pattern.setAttribute('patternUnits', 'userSpaceOnUse');
		pattern.setAttribute('width', '8');
		pattern.setAttribute('height', '8');

		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', '0');
		line.setAttribute('y1', '0');
		line.setAttribute('x2', '8');
		line.setAttribute('y2', '8');
		line.setAttribute('stroke', '#FF4444');
		line.setAttribute('stroke-width', '1');
		pattern.appendChild(line);

		defs.appendChild(pattern);

		svg.appendChild(defs);
	}

	/**
	 * Render a single node
	 */
	private renderNode(node: LayoutNode, parent: SVGGElement): void {
		const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		group.classList.add('node', `node-type-${node.type}`);
		group.setAttribute('data-id', node.id);
		group.setAttribute('data-type', node.type);
		group.setAttribute('data-label', node.label);
		if (node.parent) {
			group.setAttribute('data-parent', node.parent);
		}

		// Render based on node type
		switch (node.type) {
			case 'error':
				this.renderError(node, group);
				break;
			case 'module':
			case 'instance':
				this.renderContainer(node, group);
				break;
			case 'port':
				this.renderPort(node, group);
				break;
			case 'logic':
				this.renderLogicBlock(node, group);
				break;
			case 'signal':
				this.renderSignal(node, group);
				break;
			default:
				this.renderGenericNode(node, group);
		}

		parent.appendChild(group);
	}

	/**
	 * Render a container (module or instance)
	 */
	private renderContainer(node: LayoutNode, group: SVGGElement): void {
		const color = node.type === 'module' ? this.colorScheme.module : this.colorScheme.module;

		// Draw rounded rectangle
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', String(node.x));
		rect.setAttribute('y', String(node.y));
		rect.setAttribute('width', String(node.width));
		rect.setAttribute('height', String(node.height));
		rect.setAttribute('rx', '6');
		rect.setAttribute('ry', '6');
		rect.setAttribute('fill', color);
		rect.setAttribute('fill-opacity', '0.2');
		rect.setAttribute('stroke', color);
		rect.setAttribute('stroke-width', '2');
		rect.classList.add('node-rect');
		group.appendChild(rect);

		// Add label
		this.renderNodeLabel(node, group);

		// Add collapse/expand button for modules
		if (node.type === 'module' || node.type === 'instance') {
			this.renderCollapseButton(node, group);
		}
	}

	/**
	 * Render a port node
	 */
	private renderPort(node: LayoutNode, group: SVGGElement): void {
		// Determine port direction from node data
		const isInput = node.label.toLowerCase().includes('input') || node.portSide === 'WEST';
		const isOutput = node.label.toLowerCase().includes('output') || node.portSide === 'EAST';
		const color = isInput ? this.colorScheme.portInput :
		              isOutput ? this.colorScheme.portOutput :
		              this.colorScheme.portInout;

		// Draw port as a small circle
		const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		const centerX = node.x + node.width / 2;
		const centerY = node.y + node.height / 2;

		circle.setAttribute('cx', String(centerX));
		circle.setAttribute('cy', String(centerY));
		circle.setAttribute('r', String(this.portRadius));
		circle.setAttribute('fill', color);
		circle.setAttribute('stroke', color);
		circle.setAttribute('stroke-width', '1');
		circle.classList.add('port-circle');
		group.appendChild(circle);

		// Store port info for edge connections
		group.setAttribute('data-port-side', node.portSide || 'WEST');
		group.setAttribute('data-port-index', String(node.portIndex || 0));
	}

	/**
	 * Render a logic block (always_comb, always_ff, assign, etc.)
	 */
	private renderLogicBlock(node: LayoutNode, group: SVGGElement): void {
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', String(node.x));
		rect.setAttribute('y', String(node.y));
		rect.setAttribute('width', String(node.width));
		rect.setAttribute('height', String(node.height));
		rect.setAttribute('fill', this.colorScheme.logicBlock);
		rect.setAttribute('fill-opacity', '0.15');
		rect.setAttribute('stroke', this.colorScheme.logicBlock);
		rect.setAttribute('stroke-width', '1.5');
		rect.classList.add('logic-rect');
		group.appendChild(rect);

		// Add label
		this.renderNodeLabel(node, group);
	}

	/**
	 * Render a signal node
	 */
	private renderSignal(node: LayoutNode, group: SVGGElement): void {
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', String(node.x));
		rect.setAttribute('y', String(node.y));
		rect.setAttribute('width', String(node.width));
		rect.setAttribute('height', String(node.height));
		rect.setAttribute('rx', '3');
		rect.setAttribute('fill', this.colorScheme.signal);
		rect.setAttribute('fill-opacity', '0.1');
		rect.setAttribute('stroke', this.colorScheme.signal);
		rect.setAttribute('stroke-width', '1');
		rect.classList.add('signal-rect');
		group.appendChild(rect);

		// Add label
		this.renderNodeLabel(node, group);
	}

	/**
	 * Render an error zone
	 */
	private renderError(node: LayoutNode, group: SVGGElement): void {
		// Draw red rectangle with hatching pattern
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', String(node.x));
		rect.setAttribute('y', String(node.y));
		rect.setAttribute('width', String(node.width));
		rect.setAttribute('height', String(node.height));
		rect.setAttribute('rx', '4');
		rect.setAttribute('fill', 'url(#error-hatch)');
		rect.setAttribute('fill-opacity', '0.3');
		rect.setAttribute('stroke', '#FF4444');
		rect.setAttribute('stroke-width', '3');
		rect.setAttribute('stroke-dasharray', '5,5');
		rect.classList.add('error-zone');
		group.appendChild(rect);

		// Add error icon (X mark) at top-right corner
		const iconSize = 16;
		const iconX = node.x + node.width - iconSize - 4;
		const iconY = node.y + 4;

		// Draw X mark
		const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line1.setAttribute('x1', String(iconX));
		line1.setAttribute('y1', String(iconY));
		line1.setAttribute('x2', String(iconX + iconSize));
		line1.setAttribute('y2', String(iconY + iconSize));
		line1.setAttribute('stroke', '#FF4444');
		line1.setAttribute('stroke-width', '2');
		line1.setAttribute('stroke-linecap', 'round');
		group.appendChild(line1);

		const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line2.setAttribute('x1', String(iconX + iconSize));
		line2.setAttribute('y1', String(iconY));
		line2.setAttribute('x2', String(iconX));
		line2.setAttribute('y2', String(iconY + iconSize));
		line2.setAttribute('stroke', '#FF4444');
		line2.setAttribute('stroke-width', '2');
		line2.setAttribute('stroke-linecap', 'round');
		group.appendChild(line2);

		// Add error message label
		this.renderErrorLabel(node, group);

		// Store error information
		if (node.error) {
			group.setAttribute('data-error-message', node.error.message);
			group.setAttribute('data-error-type', node.error.type);
			if (node.error.line) {
				group.setAttribute('data-error-line', String(node.error.line));
			}
			if (node.error.column) {
				group.setAttribute('data-error-column', String(node.error.column));
			}
		}
	}

	/**
	 * Render label for an error node
	 */
	private renderErrorLabel(node: LayoutNode, group: SVGGElement): void {
		if (!node.error) {
			return;
		}

		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		const centerX = node.x + node.width / 2;
		const centerY = node.y + node.height / 2;

		text.setAttribute('x', String(centerX));
		text.setAttribute('y', String(centerY));
		text.setAttribute('text-anchor', 'middle');
		text.setAttribute('dominant-baseline', 'middle');
		text.setAttribute('font-size', '11px');
		text.setAttribute('font-weight', 'bold');
		text.setAttribute('fill', '#FF4444');
		text.setAttribute('pointer-events', 'none');
		text.classList.add('error-label');

		// Show error type or truncated message
		const label = node.error.type === 'parse-error' ? 'Parse Error' :
		              node.error.type === 'unsupported' ? 'Unsupported' : 'Warning';
		text.textContent = label;

		group.appendChild(text);
	}

	/**
	 * Render a generic node
	 */
	private renderGenericNode(node: LayoutNode, group: SVGGElement): void {
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', String(node.x));
		rect.setAttribute('y', String(node.y));
		rect.setAttribute('width', String(node.width));
		rect.setAttribute('height', String(node.height));
		rect.setAttribute('fill', this.colorScheme.logicBlock);
		rect.setAttribute('fill-opacity', '0.1');
		rect.setAttribute('stroke', this.colorScheme.edge);
		rect.setAttribute('stroke-width', '1');
		rect.classList.add('generic-rect');
		group.appendChild(rect);

		// Add label
		this.renderNodeLabel(node, group);
	}

	/**
	 * Render label for a node
	 */
	private renderNodeLabel(node: LayoutNode, group: SVGGElement): void {
		// Skip port labels (they're too small)
		if (node.type === 'port') {
			return;
		}

		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		const centerX = node.x + node.width / 2;
		const centerY = node.y + node.height / 2;

		text.setAttribute('x', String(centerX));
		text.setAttribute('y', String(centerY));
		text.setAttribute('text-anchor', 'middle');
		text.setAttribute('dominant-baseline', 'middle');
		text.setAttribute('font-size', '12px');
		text.setAttribute('fill', 'var(--vscode-editor-foreground)');
		text.setAttribute('pointer-events', 'none');
		text.classList.add('node-label');
		text.textContent = this.truncateLabel(node.label, 20);

		group.appendChild(text);
	}

	/**
	 * Render collapse/expand button for a module
	 */
	private renderCollapseButton(node: LayoutNode, group: SVGGElement): void {
		const buttonSize = 20;
		const padding = 4;
		const buttonX = node.x + node.width - buttonSize - padding;
		const buttonY = node.y + padding;

		// Create a group for the button
		const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		buttonGroup.classList.add('collapse-button-group');
		buttonGroup.setAttribute('data-module-id', node.id);
		buttonGroup.setAttribute('data-collapsed', 'false');

		// Background circle
		const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		circle.setAttribute('cx', String(buttonX + buttonSize / 2));
		circle.setAttribute('cy', String(buttonY + buttonSize / 2));
		circle.setAttribute('r', String(buttonSize / 2));
		circle.setAttribute('fill', 'var(--vscode-button-background)');
		circle.setAttribute('stroke', 'var(--vscode-button-border)');
		circle.setAttribute('stroke-width', '1');
		circle.classList.add('collapse-button-bg');
		buttonGroup.appendChild(circle);

		// Text symbol (+ or -)
		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.setAttribute('x', String(buttonX + buttonSize / 2));
		text.setAttribute('y', String(buttonY + buttonSize / 2 + 1));
		text.setAttribute('text-anchor', 'middle');
		text.setAttribute('dominant-baseline', 'middle');
		text.setAttribute('font-size', '12px');
		text.setAttribute('font-weight', 'bold');
		text.setAttribute('fill', 'var(--vscode-button-foreground)');
		text.setAttribute('pointer-events', 'none');
		text.classList.add('collapse-button-text');
		text.textContent = '+';
		buttonGroup.appendChild(text);

		// Make button clickable
		buttonGroup.style.cursor = 'pointer';
		buttonGroup.classList.add('collapse-button');

		group.appendChild(buttonGroup);
	}

	/**
	 * Render an edge with routing
	 */
	private renderEdge(edge: LayoutEdge, parent: SVGGElement, layout: Layout): void {
		if (!edge.points || edge.points.length < 2) {
			console.warn('Edge has insufficient points:', edge);
			return;
		}

		const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		group.classList.add('edge', `edge-type-${edge.type || 'signal'}`);
		group.setAttribute('data-source', edge.source);
		group.setAttribute('data-target', edge.target);

		// Add a unique ID for the signal/net for interaction tracking
		const signalId = `${edge.source}_${edge.target}`;
		group.setAttribute('data-id', signalId);

		// Store signal label for tooltips
		if (edge.label) {
			group.setAttribute('data-signal-name', edge.label);
		}
		group.setAttribute('data-signal-type', edge.type || 'signal');

		// Create path from waypoints
		const pathData = this.createPathData(edge.points);
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', pathData);
		path.setAttribute('stroke', this.colorScheme.edge);
		path.setAttribute('stroke-width', '1.5');
		path.setAttribute('fill', 'none');
		path.setAttribute('marker-end', 'url(#arrowhead)');
		path.classList.add('edge-path');
		group.appendChild(path);

		// Add label if present
		if (edge.label) {
			this.renderEdgeLabel(edge, group);
		}

		parent.appendChild(group);
	}

	/**
	 * Create SVG path data from waypoints
	 */
	private createPathData(points: Array<[number, number]>): string {
		if (points.length === 0) {
			return '';
		}

		// Start with move to first point
		let path = `M ${points[0][0]} ${points[0][1]}`;

		// Line to each subsequent point
		for (let i = 1; i < points.length; i++) {
			path += ` L ${points[i][0]} ${points[i][1]}`;
		}

		return path;
	}

	/**
	 * Render label for an edge
	 */
	private renderEdgeLabel(edge: LayoutEdge, group: SVGGElement): void {
		if (!edge.label || edge.points.length < 2) {
			return;
		}

		// Find midpoint for label placement
		const midIdx = Math.floor(edge.points.length / 2);
		const [midX, midY] = edge.points[midIdx];

		// Offset slightly above the midpoint
		const offsetY = -8;

		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.setAttribute('x', String(midX));
		text.setAttribute('y', String(midY + offsetY));
		text.setAttribute('text-anchor', 'middle');
		text.setAttribute('dominant-baseline', 'middle');
		text.setAttribute('font-size', '10px');
		text.setAttribute('fill', 'var(--vscode-editorGutter-foreground)');
		text.setAttribute('pointer-events', 'none');
		text.classList.add('edge-label');

		// Add background for readability
		const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		const textLength = edge.label.length * 4 + 4; // Rough estimate
		bgRect.setAttribute('x', String(midX - textLength / 2));
		bgRect.setAttribute('y', String(midY + offsetY - 8));
		bgRect.setAttribute('width', String(textLength));
		bgRect.setAttribute('height', '14');
		bgRect.setAttribute('fill', 'var(--vscode-editor-background)');
		bgRect.setAttribute('fill-opacity', '0.9');
		bgRect.setAttribute('rx', '2');
		group.insertBefore(bgRect, text);

		text.textContent = edge.label;
		group.appendChild(text);
	}

	/**
	 * Truncate label to specified length
	 */
	private truncateLabel(label: string, maxLength: number): string {
		if (label.length <= maxLength) {
			return label;
		}
		return label.substring(0, maxLength - 3) + '...';
	}

	/**
	 * Update color scheme
	 */
	setColorScheme(colorScheme: Partial<ColorScheme>): void {
		this.colorScheme = { ...this.colorScheme, ...colorScheme };
	}

	/**
	 * Get current color scheme
	 */
	getColorScheme(): ColorScheme {
		return { ...this.colorScheme };
	}
}
