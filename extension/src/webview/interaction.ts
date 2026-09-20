/**
 * Signal/Net Interaction Handler
 * Manages interactivity for diagram signals (nets) and nodes.
 * Enables clicking to highlight signals and connected nodes.
 *
 * T9 Enhancement: Signal path tracing with full path highlighting and metadata display
 */

import { Layout, LayoutEdge } from './types/layout';

/**
 * Signal metadata extracted from layout edges
 */
interface SignalMetadata {
	signalName: string;
	width?: number | string;
	type?: string;
	sourceId?: string;
	targetId?: string;
	edgeCount: number;
}

/**
 * Tracks the state of highlighted signals and nodes
 */
interface HighlightState {
	highlightedSignals: Set<string>;
	highlightedNodes: Set<string>;
	selectedSignal: string | null;
	selectedSignalMetadata: SignalMetadata | null;
}

/**
 * Manages signal and node interactivity in the diagram
 */
export class DiagramInteraction {
	private highlightState: HighlightState = {
		highlightedSignals: new Set(),
		highlightedNodes: new Set(),
		selectedSignal: null,
		selectedSignalMetadata: null,
	};
	private layout: Layout | null = null;
	private svg: SVGElement | null = null;
	private signalPathCache: Map<string, LayoutEdge[]> = new Map();
	private signalMetadataCache: Map<string, SignalMetadata> = new Map();

	/**
	 * Setup signal/net click handlers and interactivity
	 * @param svg - The SVG element containing the diagram
	 * @param layout - The layout data containing nodes and edges
	 */
	setupSignalHandlers(svg: SVGElement, layout: Layout): void {
		this.svg = svg;
		this.layout = layout;

		// Build signal path cache for efficient lookups
		this.buildSignalPathCache();

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
	 * Build cache of signal paths by signal name for efficient lookups
	 * T9: Pre-compute which edges belong to the same signal
	 */
	private buildSignalPathCache(): void {
		if (!this.layout) {
			return;
		}

		this.signalPathCache.clear();
		this.signalMetadataCache.clear();

		// Group edges by signal name
		const edgesBySignal = new Map<string, LayoutEdge[]>();
		const signalMetadata = new Map<string, SignalMetadata>();

		for (const edge of this.layout.edges) {
			const signalName = this.extractSignalName(edge);
			const edgeWidth = this.extractSignalWidth(edge);

			if (!edgesBySignal.has(signalName)) {
				edgesBySignal.set(signalName, []);
				signalMetadata.set(signalName, {
					signalName,
					width: edgeWidth,
					type: this.extractSignalType(edge),
					edgeCount: 0,
				});
			}

			edgesBySignal.get(signalName)!.push(edge);
			const meta = signalMetadata.get(signalName)!;
			meta.edgeCount = edgesBySignal.get(signalName)!.length;

			// Track first source and target (for display)
			if (!meta.sourceId && edge.source) {
				meta.sourceId = edge.source;
			}
			if (!meta.targetId && edge.target) {
				meta.targetId = edge.target;
			}
		}

		// Store caches
		this.signalPathCache = edgesBySignal;
		this.signalMetadataCache = signalMetadata;
	}

	/**
	 * Extract signal name from edge label
	 * T9: Used to group edges by signal for path tracing
	 */
	private extractSignalName(edge: LayoutEdge): string {
		if (edge.label) {
			const label = typeof edge.label === 'string' ? edge.label : (edge.label as any).text || String(edge.label);
			return label.split('[')[0].trim(); // Remove width notation if present
		}
		return `${edge.source}_to_${edge.target}`;
	}

	/**
	 * Extract signal width from edge label
	 * T9: For metadata display (e.g., "16", "32", etc.)
	 */
	private extractSignalWidth(edge: LayoutEdge): string | number | undefined {
		// Try to parse from label like "signal[15:0]" -> "16"
		if (edge.label) {
			const label = typeof edge.label === 'string' ? edge.label : (edge.label as any).text || String(edge.label);
			const match = label.match(/\[(\d+):(\d+)\]/);
			if (match) {
				const high = parseInt(match[1], 10);
				const low = parseInt(match[2], 10);
				return Math.abs(high - low) + 1;
			}
		}

		return undefined;
	}

	/**
	 * Extract signal type from edge properties
	 * T9: For metadata display (signal, clock, reset, control)
	 */
	private extractSignalType(edge: LayoutEdge): string | undefined {
		if (edge.type) {
			return edge.type;
		}
		return 'signal';
	}

	/**
	 * Setup interactivity for a single edge/signal
	 * T9: Enhanced with full signal path tracing on hover and click
	 */
	private setupEdgeInteractivity(edgeElement: SVGGElement): void {
		const edgeId = edgeElement.getAttribute('data-id') ||
			`${edgeElement.getAttribute('data-source')}_${edgeElement.getAttribute('data-target')}`;
		const signalLabel = edgeElement.getAttribute('data-signal-name') ||
			edgeElement.querySelector('.edge-label')?.textContent || '';

		edgeElement.style.cursor = 'pointer';

		// T9: Hover effects with signal path highlighting
		edgeElement.addEventListener('mouseenter', () => {
			// Only show hover effects if no persistent selection
			if (this.highlightState.selectedSignal === null) {
				const signalName = this.extractSignalNameFromLabel(signalLabel);
				this.highlightSignalPath(signalName, true); // true = hover mode
				this.showSignalMetadata(signalName, edgeElement);
			}
		});

		edgeElement.addEventListener('mouseleave', () => {
			// Clear hover effects if no persistent selection
			if (this.highlightState.selectedSignal === null) {
				this.clearHighlight();
			} else {
				// Restore persistent selection highlighting
				this.highlightSignalPath(this.highlightState.selectedSignal, false);
			}
			this.hideSignalMetadata();
		});

		// T9: Click to select - persistent selection with full metadata
		edgeElement.addEventListener('click', (event) => {
			event.stopPropagation();
			const signalName = this.extractSignalNameFromLabel(signalLabel);

			// Toggle selection: click same signal to deselect
			if (this.highlightState.selectedSignal === signalName) {
				this.clearHighlight();
			} else {
				this.selectSignalPath(signalName);
				this.showSignalMetadata(signalName, edgeElement);
			}
		});
	}

	/**
	 * Extract signal name from edge label
	 * T9: Parse label text to get clean signal name
	 */
	private extractSignalNameFromLabel(labelText: string): string {
		return labelText.split('[')[0].trim() || labelText.trim();
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
	 * T9: Highlight entire signal path - all edges with same signal name
	 * @param signalName - The signal name to highlight
	 * @param isHover - Whether this is a hover or persistent selection
	 */
	private highlightSignalPath(signalName: string, isHover: boolean): void {
		if (!this.svg || !this.layout) {
			return;
		}

		this.clearHighlight();

		// Find all edges with this signal name
		const matchingEdges = this.signalPathCache.get(signalName) || [];

		// Highlight all matching edges with distinct color (#0066ff at 50% opacity)
		const edgeElements = this.svg.querySelectorAll('.edge');
		const highlightedEdgeIds = new Set<string>();

		for (const layoutEdge of matchingEdges) {
			const edgeId = `${layoutEdge.source}_${layoutEdge.target}`;
			highlightedEdgeIds.add(edgeId);
		}

		edgeElements.forEach((edge) => {
			const edgeDataId = edge.getAttribute('data-id') ||
				`${edge.getAttribute('data-source')}_${edge.getAttribute('data-target')}`;

			if (highlightedEdgeIds.has(edgeDataId)) {
				edge.classList.add('signal-path-highlighted');
				const path = edge.querySelector('.edge-path');
				if (path) {
					path.classList.add('signal-path-highlighted');
				}
				this.highlightState.highlightedSignals.add(edgeDataId);
			} else {
				edge.classList.add('signal-path-dimmed');
				const path = edge.querySelector('.edge-path');
				if (path) {
					path.classList.add('signal-path-dimmed');
				}
			}
		});

		// Highlight source and destination nodes
		const nodeElements = this.svg.querySelectorAll('.node');
		const sourceTargetIds = new Set<string>();

		for (const layoutEdge of matchingEdges) {
			sourceTargetIds.add(layoutEdge.source);
			sourceTargetIds.add(layoutEdge.target);
		}

		nodeElements.forEach((node) => {
			const nodeId = node.getAttribute('data-id');
			if (nodeId && sourceTargetIds.has(nodeId)) {
				node.classList.add('signal-endpoint-highlighted');
				this.highlightState.highlightedNodes.add(nodeId);
			} else {
				node.classList.add('signal-path-dimmed');
			}
		});
	}

	/**
	 * T9: Select a signal path persistently with full metadata
	 * @param signalName - The signal name to select
	 */
	private selectSignalPath(signalName: string): void {
		this.highlightSignalPath(signalName, false);
		this.highlightState.selectedSignal = signalName;
		this.highlightState.selectedSignalMetadata = this.signalMetadataCache.get(signalName) || null;
	}

	/**
	 * T9: Show signal metadata in sidebar
	 * @param signalName - The signal name
	 * @param edgeElement - The edge element (for positioning)
	 */
	private showSignalMetadata(signalName: string, edgeElement: SVGGElement): void {
		const metadata = this.signalMetadataCache.get(signalName);
		if (!metadata || !this.svg) {
			return;
		}

		// Create or update metadata sidebar
		let sidebar = this.svg.ownerDocument.querySelector('.signal-metadata-sidebar') as HTMLElement | null;
		if (!sidebar) {
			sidebar = document.createElement('div');
			sidebar.className = 'signal-metadata-sidebar';
			const container = this.svg.parentElement;
			if (container) {
				container.appendChild(sidebar);
			}
		}

		// Build metadata display
		const widthStr = metadata.width ? ` [${metadata.width} bits]` : '';
		const edgeCountStr = metadata.edgeCount > 1 ? ` (${metadata.edgeCount} edges)` : '';
		const typeStr = metadata.type ? ` (${metadata.type})` : '';

		let sourceLabel = 'Unknown';
		let targetLabel = 'Unknown';

		// Get source and target labels from layout
		if (metadata.sourceId && this.layout) {
			const sourceNode = this.layout.nodes.find(n => n.id === metadata.sourceId);
			sourceLabel = sourceNode?.label || metadata.sourceId;
		}
		if (metadata.targetId && this.layout) {
			const targetNode = this.layout.nodes.find(n => n.id === metadata.targetId);
			targetLabel = targetNode?.label || metadata.targetId;
		}

		sidebar.innerHTML = `
			<div class="signal-metadata-content">
				<div class="signal-metadata-header">
					<h3>${metadata.signalName}</h3>
					<button class="signal-metadata-close" onclick="this.closest('.signal-metadata-sidebar').style.display='none'">✕</button>
				</div>
				<div class="signal-metadata-body">
					<div class="signal-metadata-row">
						<span class="signal-metadata-label">Width:</span>
						<span class="signal-metadata-value">${metadata.width || 'N/A'} bits</span>
					</div>
					<div class="signal-metadata-row">
						<span class="signal-metadata-label">Type:</span>
						<span class="signal-metadata-value">${metadata.type || 'signal'}</span>
					</div>
					<div class="signal-metadata-row">
						<span class="signal-metadata-label">Source:</span>
						<span class="signal-metadata-value">${sourceLabel}</span>
					</div>
					<div class="signal-metadata-row">
						<span class="signal-metadata-label">Target:</span>
						<span class="signal-metadata-value">${targetLabel}</span>
					</div>
					${metadata.edgeCount > 1 ? `
					<div class="signal-metadata-row">
						<span class="signal-metadata-label">Edges:</span>
						<span class="signal-metadata-value">${metadata.edgeCount}</span>
					</div>
					` : ''}
				</div>
			</div>
		`;

		if (sidebar) {
			sidebar.style.display = 'block';
		}
	}

	/**
	 * T9: Hide signal metadata sidebar
	 */
	private hideSignalMetadata(): void {
		if (this.highlightState.selectedSignal === null) {
			const sidebar = this.svg?.ownerDocument.querySelector('.signal-metadata-sidebar') as HTMLElement | null;
			if (sidebar) {
				sidebar.style.display = 'none';
			}
		}
	}

	/**
	 * Highlight a signal/net and all connected nodes (legacy)
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
	 * T9: Also clears persistent selection and metadata display
	 */
	clearHighlight(): void {
		if (!this.svg) {
			return;
		}

		// Remove highlighted and dimmed classes from all edges
		const edgeElements = this.svg.querySelectorAll('.edge');
		edgeElements.forEach((edge) => {
			edge.classList.remove('highlighted', 'dimmed', 'signal-path-highlighted', 'signal-path-dimmed');
			const path = edge.querySelector('.edge-path');
			if (path) {
				path.classList.remove('highlighted', 'dimmed', 'signal-path-highlighted', 'signal-path-dimmed');
			}
		});

		// Remove highlighted and dimmed classes from all nodes
		const nodeElements = this.svg.querySelectorAll('.node');
		nodeElements.forEach((node) => {
			node.classList.remove('highlighted', 'dimmed', 'signal-endpoint-highlighted');
		});

		// Clear state
		this.highlightState.highlightedSignals.clear();
		this.highlightState.highlightedNodes.clear();
		this.highlightState.selectedSignal = null;
		this.highlightState.selectedSignalMetadata = null;

		this.hideSignalTooltip();
		this.hideSignalMetadata();
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
	 * T9: Includes selected signal metadata
	 */
	getHighlightState(): HighlightState {
		return {
			highlightedSignals: new Set(this.highlightState.highlightedSignals),
			highlightedNodes: new Set(this.highlightState.highlightedNodes),
			selectedSignal: this.highlightState.selectedSignal,
			selectedSignalMetadata: this.highlightState.selectedSignalMetadata ? { ...this.highlightState.selectedSignalMetadata } : null,
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
