/**
 * Signal/Net Interaction Handler
 * Manages interactivity for diagram signals (nets) and nodes.
 * Enables clicking to highlight signals and connected nodes.
 */

import { Layout } from './types/layout';

/**
 * Tracks the state of highlighted signals and nodes
 */
interface HighlightState {
	highlightedSignals: Set<string>;
	highlightedNodes: Set<string>;
}

/**
 * Manages signal and node interactivity in the diagram
 */
export class DiagramInteraction {
	private highlightState: HighlightState = {
		highlightedSignals: new Set(),
		highlightedNodes: new Set(),
	};
	private layout: Layout | null = null;
	private svg: SVGElement | null = null;

	/**
	 * Setup signal/net click handlers and interactivity
	 * @param svg - The SVG element containing the diagram
	 * @param layout - The layout data containing nodes and edges
	 */
	setupSignalHandlers(svg: SVGElement, layout: Layout): void {
		this.svg = svg;
		this.layout = layout;

		// Setup click handlers for edges (signals/nets)
		const edges = svg.querySelectorAll('.edge');
		edges.forEach((edge) => {
			const edgeElement = edge as SVGGElement;
			this.setupEdgeInteractivity(edgeElement);
		});

		// Setup click handlers for nodes
		const nodes = svg.querySelectorAll('.node');
		nodes.forEach((node) => {
			const nodeElement = node as SVGGElement;
			this.setupNodeInteractivity(nodeElement);
		});

		// Setup click handler on SVG background to clear highlights
		svg.addEventListener('click', (event) => {
			if (event.target === svg || event.target instanceof SVGElement) {
				const target = event.target as SVGElement;
				if (target.classList && !target.closest('.edge') && !target.closest('.node')) {
					this.clearHighlight();
				}
			}
		});
	}

	/**
	 * Setup interactivity for a single edge/signal
	 */
	private setupEdgeInteractivity(edgeElement: SVGGElement): void {
		const edgeId = edgeElement.getAttribute('data-id') ||
			`${edgeElement.getAttribute('data-source')}_${edgeElement.getAttribute('data-target')}`;

		edgeElement.style.cursor = 'pointer';

		// Hover effects
		edgeElement.addEventListener('mouseenter', () => {
			if (this.highlightState.highlightedSignals.size === 0) {
				this.dimAllEdges();
				edgeElement.classList.add('highlighted');
			}
			this.showSignalTooltip(edgeElement);
		});

		edgeElement.addEventListener('mouseleave', () => {
			if (this.highlightState.highlightedSignals.size === 0) {
				this.clearEdgeDimming();
				edgeElement.classList.remove('highlighted');
			}
			this.hideSignalTooltip();
		});

		// Click to select
		edgeElement.addEventListener('click', (event) => {
			event.stopPropagation();
			this.highlightSignal(edgeId);
		});
	}

	/**
	 * Setup interactivity for a single node
	 */
	private setupNodeInteractivity(nodeElement: SVGGElement): void {
		const nodeId = nodeElement.getAttribute('data-id');
		if (!nodeId) {
			return;
		}

		nodeElement.style.cursor = 'pointer';

		// Hover effects
		nodeElement.addEventListener('mouseenter', () => {
			if (this.highlightState.highlightedNodes.size === 0) {
				this.showNodeTooltip(nodeElement);
			}
		});

		nodeElement.addEventListener('mouseleave', () => {
			if (this.highlightState.highlightedNodes.size === 0) {
				this.hideSignalTooltip();
			}
		});

		// Click to select
		nodeElement.addEventListener('click', (event) => {
			event.stopPropagation();
			this.highlightNode(nodeId);
		});
	}

	/**
	 * Highlight a signal/net and all connected nodes
	 * @param signalId - The signal/edge identifier
	 */
	highlightSignal(signalId: string): void {
		if (!this.svg || !this.layout) {
			return;
		}

		// Clear previous highlights
		this.clearHighlight();

		// Add the signal to highlighted set
		this.highlightState.highlightedSignals.add(signalId);

		// Find the edge element and highlight it
		const edgeElements = this.svg.querySelectorAll('.edge');
		edgeElements.forEach((edge) => {
			const dataId = edge.getAttribute('data-id') ||
				`${edge.getAttribute('data-source')}_${edge.getAttribute('data-target')}`;
			if (dataId === signalId) {
				edge.classList.add('highlighted');
				// Also highlight the path element
				const path = edge.querySelector('.edge-path');
				if (path) {
					path.classList.add('highlighted');
				}
			} else {
				edge.classList.add('dimmed');
				const path = edge.querySelector('.edge-path');
				if (path) {
					path.classList.add('dimmed');
				}
			}
		});

		// Find connected nodes from the edge's source and target
		const sourceId = this.findEdgeSourceId(signalId);
		const targetId = this.findEdgeTargetId(signalId);

		if (sourceId) {
			this.highlightState.highlightedNodes.add(sourceId);
		}
		if (targetId) {
			this.highlightState.highlightedNodes.add(targetId);
		}

		// Highlight connected nodes
		const nodeElements = this.svg.querySelectorAll('.node');
		nodeElements.forEach((node) => {
			const nodeId = node.getAttribute('data-id');
			if (nodeId === sourceId || nodeId === targetId) {
				node.classList.add('highlighted');
			} else {
				node.classList.add('dimmed');
			}
		});
	}

	/**
	 * Highlight a node and all connected signals/nets
	 * @param nodeId - The node identifier
	 */
	highlightNode(nodeId: string): void {
		if (!this.svg || !this.layout) {
			return;
		}

		// Clear previous highlights
		this.clearHighlight();

		// Add the node to highlighted set
		this.highlightState.highlightedNodes.add(nodeId);

		// Highlight the node itself
		const nodeElements = this.svg.querySelectorAll('.node');
		nodeElements.forEach((node) => {
			if (node.getAttribute('data-id') === nodeId) {
				node.classList.add('highlighted');
			} else {
				node.classList.add('dimmed');
			}
		});

		// Find all edges connected to this node
		const edgeElements = this.svg.querySelectorAll('.edge');
		edgeElements.forEach((edge) => {
			const sourceId = edge.getAttribute('data-source');
			const targetId = edge.getAttribute('data-target');

			if (sourceId === nodeId || targetId === nodeId) {
				edge.classList.add('highlighted');
				const path = edge.querySelector('.edge-path');
				if (path) {
					path.classList.add('highlighted');
				}

				// Also highlight the other connected node
				const otherNodeId = sourceId === nodeId ? targetId : sourceId;
				if (otherNodeId && this.svg) {
					this.highlightState.highlightedNodes.add(otherNodeId);
					const otherNode = this.svg.querySelector(`[data-id="${otherNodeId}"]`);
					if (otherNode) {
						otherNode.classList.add('highlighted');
					}
				}
			} else {
				edge.classList.add('dimmed');
				const path = edge.querySelector('.edge-path');
				if (path) {
					path.classList.add('dimmed');
				}
			}
		});
	}

	/**
	 * Clear all highlighting
	 */
	clearHighlight(): void {
		if (!this.svg) {
			return;
		}

		// Remove highlighted and dimmed classes from all edges
		const edgeElements = this.svg.querySelectorAll('.edge');
		edgeElements.forEach((edge) => {
			edge.classList.remove('highlighted', 'dimmed');
			const path = edge.querySelector('.edge-path');
			if (path) {
				path.classList.remove('highlighted', 'dimmed');
			}
		});

		// Remove highlighted and dimmed classes from all nodes
		const nodeElements = this.svg.querySelectorAll('.node');
		nodeElements.forEach((node) => {
			node.classList.remove('highlighted', 'dimmed');
		});

		// Clear state
		this.highlightState.highlightedSignals.clear();
		this.highlightState.highlightedNodes.clear();

		this.hideSignalTooltip();
	}

	/**
	 * Dim all edges except highlighted ones
	 */
	private dimAllEdges(): void {
		if (!this.svg) {
			return;
		}

		const edges = this.svg.querySelectorAll('.edge');
		edges.forEach((edge) => {
			if (!edge.classList.contains('highlighted')) {
				edge.classList.add('dimmed');
			}
		});
	}

	/**
	 * Clear dimming from all edges
	 */
	private clearEdgeDimming(): void {
		if (!this.svg) {
			return;
		}

		const edges = this.svg.querySelectorAll('.edge');
		edges.forEach((edge) => {
			edge.classList.remove('dimmed');
		});
	}

	/**
	 * Show tooltip with signal information on hover
	 */
	private showSignalTooltip(edgeElement: SVGGElement): void {
		const label = edgeElement.querySelector('.edge-label');
		if (label) {
			label.classList.add('tooltip-visible');
		}
	}

	/**
	 * Hide tooltip
	 */
	private hideSignalTooltip(): void {
		if (!this.svg) {
			return;
		}

		const labels = this.svg.querySelectorAll('.edge-label');
		labels.forEach((label) => {
			label.classList.remove('tooltip-visible');
		});
	}

	/**
	 * Show tooltip with node information on hover
	 */
	private showNodeTooltip(nodeElement: SVGGElement): void {
		const label = nodeElement.querySelector('.node-label');
		if (label) {
			label.classList.add('tooltip-visible');
		}
	}

	/**
	 * Find the source node ID for a signal
	 */
	private findEdgeSourceId(signalId: string): string | null {
		if (!this.layout) {
			return null;
		}

		for (const edge of this.layout.edges) {
			const edgeId = `${edge.source}_${edge.target}`;
			if (edgeId === signalId) {
				return edge.source;
			}
		}
		return null;
	}

	/**
	 * Find the target node ID for a signal
	 */
	private findEdgeTargetId(signalId: string): string | null {
		if (!this.layout) {
			return null;
		}

		for (const edge of this.layout.edges) {
			const edgeId = `${edge.source}_${edge.target}`;
			if (edgeId === signalId) {
				return edge.target;
			}
		}
		return null;
	}

	/**
	 * Get the current highlight state
	 */
	getHighlightState(): HighlightState {
		return {
			highlightedSignals: new Set(this.highlightState.highlightedSignals),
			highlightedNodes: new Set(this.highlightState.highlightedNodes),
		};
	}

	/**
	 * Check if a signal is highlighted
	 */
	isSignalHighlighted(signalId: string): boolean {
		return this.highlightState.highlightedSignals.has(signalId);
	}

	/**
	 * Check if a node is highlighted
	 */
	isNodeHighlighted(nodeId: string): boolean {
		return this.highlightState.highlightedNodes.has(nodeId);
	}
}
