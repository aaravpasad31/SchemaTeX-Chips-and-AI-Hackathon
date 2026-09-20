/**
 * Layout engine using ELK (Eclipse Layout Kernel) to compute diagram node and edge coordinates.
 * Transforms AST structures into SVG-ready layout data with proper spacing and hierarchical handling.
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import { Layout, LayoutNode, LayoutEdge, ElkGraph, ElkNode, ElkEdge } from './types/layout';
import { ParserOutput } from '../types/ast';

/**
 * Configuration options for the ELK layout algorithm
 */
interface LayoutConfig {
	/** Layout algorithm: 'elk.layered' for hierarchical, 'elk.force' for force-directed, etc. */
	algorithm: string;
	/** Layout direction: 'RIGHT' (left-to-right), 'DOWN' (top-to-bottom), 'LEFT', 'UP' */
	direction: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
	/** Spacing between nodes in pixels */
	nodeSpacing: number;
	/** Edge spacing in pixels */
	edgeSpacing: number;
	/** Padding inside hierarchical containers (module boxes) in pixels */
	containerPadding: number;
	/** Default node width */
	defaultNodeWidth: number;
	/** Default node height */
	defaultNodeHeight: number;
	/** Port width for edge connection points */
	portWidth: number;
	/** Port height */
	portHeight: number;
}

/**
 * Default layout configuration - optimized for hierarchical SystemVerilog modules
 */
const DEFAULT_CONFIG: LayoutConfig = {
	algorithm: 'elk.layered',
	direction: 'DOWN',
	nodeSpacing: 50,
	edgeSpacing: 20,
	containerPadding: 20,
	defaultNodeWidth: 120,
	defaultNodeHeight: 60,
	portWidth: 8,
	portHeight: 8,
};

/**
 * Wraps ELK (Eclipse Layout Kernel) to compute diagram layouts.
 * Handles transformation from AST to ELK graph format and back to layout coordinates.
 */
export class LayoutEngine {
	private elk: InstanceType<typeof ELK>;
	private config: LayoutConfig;

	constructor(config: Partial<LayoutConfig> = {}) {
		this.elk = new (ELK as any)();
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Computes layout for the given AST, returning positioned nodes and routed edges.
	 * Main entry point for the layout engine.
	 * @param ast - Parser output (AST) with nodes and edges
	 * @returns Promise resolving to Layout with coordinates for all elements
	 */
	async computeLayout(ast: ParserOutput): Promise<Layout> {
		try {
			const componentCount = (ast.module?.ports?.length || 0) + (ast.module?.signals?.length || 0) + (ast.module?.instances?.length || 0);
			console.log('[LayoutEngine] Computing layout for', componentCount, 'components');

			// Transform AST to ELK graph format
			const elkGraph = this.transformAstToElkGraph(ast);

			// Run ELK layout algorithm
			const layouted = await this.elk.layout(elkGraph as any);

			// Transform ELK output back to Layout format
			const layout = this.transformElkLayoutToLayout(layouted as any, ast);

			console.log('[LayoutEngine] Layout computed:', {
				width: layout.width,
				height: layout.height,
				nodes: layout.nodes.length,
				edges: layout.edges.length,
			});

			return layout;
		} catch (error) {
			console.error('[LayoutEngine] Error computing layout:', error);
			throw new Error(
				`Failed to compute layout: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Transforms parser AST to ELK graph format
	 * @param ast - Parser output with module structure
	 * @returns ELK graph ready for layout algorithm
	 */
	private transformAstToElkGraph(ast: ParserOutput): ElkGraph {
		const elkNodes: ElkNode[] = [];
		const elkEdges: ElkEdge[] = [];
		const nodeMap = new Map<string, string>();

		// Transform the module into nodes
		if (ast.module) {
			const mod = ast.module;

			// Add module itself as the root container
			const moduleNode: ElkNode = {
				id: `module-${mod.name}`,
				label: {
					text: mod.name,
				},
				width: 200,
				height: 150,
				layoutOptions: {
					'org.eclipse.elk.padding': `[top=${this.config.containerPadding},left=${this.config.containerPadding},bottom=${this.config.containerPadding},right=${this.config.containerPadding}]`,
				},
				properties: {
					type: 'module',
				},
			};
			elkNodes.push(moduleNode);

			// Add ports as nodes
			mod.ports?.forEach((port) => {
				const nodeId = `port-${port.name}`;
				nodeMap.set(port.name, nodeId);

				const portNode: ElkNode = {
					id: nodeId,
					label: {
						text: port.name,
					},
					width: this.config.portWidth,
					height: this.config.portHeight,
					layoutOptions: {
						'org.eclipse.elk.port.side': 'WEST',
						'org.eclipse.elk.portConstraints': 'FIXED_SIDE',
					},
					properties: {
						type: 'port',
						direction: port.direction,
					},
				};
				elkNodes.push(portNode);
			});

			// Add signals as nodes
			mod.signals?.forEach((signal) => {
				const nodeId = `signal-${signal.name}`;
				nodeMap.set(signal.name, nodeId);

				const signalNode: ElkNode = {
					id: nodeId,
					label: {
						text: signal.name,
					},
					width: 80,
					height: 30,
					layoutOptions: {},
					properties: {
						type: 'signal',
						signalType: signal.signalType,
						width: signal.width,
					},
				};
				elkNodes.push(signalNode);
			});

			// Add instances as nodes
			mod.instances?.forEach((instance) => {
				const nodeId = `instance-${instance.instanceName}`;
				nodeMap.set(instance.instanceName, nodeId);

				const instanceNode: ElkNode = {
					id: nodeId,
					label: {
						text: instance.instanceName,
					},
					width: 120,
					height: 80,
					layoutOptions: {
						'org.eclipse.elk.padding': `[top=${this.config.containerPadding},left=${this.config.containerPadding},bottom=${this.config.containerPadding},right=${this.config.containerPadding}]`,
					},
					properties: {
						type: 'instance',
						moduleName: instance.moduleName,
					},
				};
				elkNodes.push(instanceNode);

				// Create edges for port connections
				instance.portConnections?.forEach((conn, connIdx) => {
					const edgeId = `edge-${instance.instanceName}-${connIdx}`;
					elkEdges.push({
						id: edgeId,
						sources: [nodeId],
						targets: [nodeMap.get(conn.signal) || ''],
						label: {
							text: conn.port,
						},
					});
				});
			});
		}

		// Create root ELK graph
		const elkGraph: ElkGraph = {
			id: 'root',
			layoutOptions: {
				'org.eclipse.elk.algorithm': this.config.algorithm,
				'org.eclipse.elk.direction': this.config.direction,
				'org.eclipse.elk.spacing.nodeNode': this.config.nodeSpacing,
				'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
				'org.eclipse.elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
				'org.eclipse.elk.spacing.edgeEdge': this.config.edgeSpacing,
				'org.eclipse.elk.spacing.edgeNode': this.config.edgeSpacing,
			},
			children: elkNodes,
			edges: elkEdges,
		};

		return elkGraph;
	}

	/**
	 * Gets layout options for a specific node based on its type
	 * @param nodeType - Type of node
	 * @returns ELK layout options
	 */
	private getNodeLayoutOptions(nodeType: string): Record<string, string | number | boolean> {
		const options: Record<string, string | number | boolean> = {};

		// Configure port constraints for proper edge routing
		if (nodeType === 'port') {
			options['org.eclipse.elk.port.side'] = 'WEST';
			options['org.eclipse.elk.portConstraints'] = 'FIXED_SIDE';
		}

		// Hierarchical modules get container padding
		if (nodeType === 'module' || nodeType === 'instance') {
			options['org.eclipse.elk.padding'] = `[top=${this.config.containerPadding},left=${this.config.containerPadding},bottom=${this.config.containerPadding},right=${this.config.containerPadding}]`;
		}

		return options;
	}

	/**
	 * Calculates node width based on type and label length
	 * @param nodeType - Type of node
	 * @param labelLength - Length of node label
	 * @returns Width in pixels
	 */
	private getNodeWidth(nodeType: string, labelLength: number = 0): number {
		if (nodeType === 'port') {
			return 40; // Small ports
		}
		if (nodeType === 'instance') {
			return 160; // Larger boxes for instances
		}
		if (nodeType === 'module') {
			return 200;
		}
		// Default width for logic, signal, etc.
		return Math.max(this.config.defaultNodeWidth, labelLength * 8);
	}

	/**
	 * Calculates node height based on type
	 * @param nodeType - Type of node
	 * @returns Height in pixels
	 */
	private getNodeHeight(nodeType: string): number {
		if (nodeType === 'port') {
			return 16; // Small ports
		}
		if (nodeType === 'instance') {
			return 80; // Taller boxes for instances
		}
		// Default height
		return this.config.defaultNodeHeight;
	}

	/**
	 * Transforms ELK layout output back to Layout format for rendering
	 * @param elkLayout - Layouted ELK graph
	 * @param originalAst - Original parser output for reference
	 * @returns Layout with positioned nodes and routed edges
	 */
	private transformElkLayoutToLayout(elkLayout: any, originalAst: ParserOutput): Layout {
		const layoutNodes: LayoutNode[] = [];
		const layoutEdges: LayoutEdge[] = [];

		// Track diagram bounds
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		// Transform ELK nodes back to layout nodes
		if (elkLayout.children) {
			(elkLayout.children as any[]).forEach((elkNode: any) => {
				const layoutNode: LayoutNode = {
					id: elkNode.id,
					label: elkNode.label?.text || elkNode.id,
					type: (elkNode.properties?.type as any) || 'logic',
					x: elkNode.x || 0,
					y: elkNode.y || 0,
					width: elkNode.width || this.config.defaultNodeWidth,
					height: elkNode.height || this.config.defaultNodeHeight,
				};

				layoutNodes.push(layoutNode);

				// Update bounds
				minX = Math.min(minX, layoutNode.x);
				minY = Math.min(minY, layoutNode.y);
				maxX = Math.max(maxX, layoutNode.x + layoutNode.width);
				maxY = Math.max(maxY, layoutNode.y + layoutNode.height);
			});
		}

		// Transform ELK edges back to layout edges
		if (elkLayout.edges) {
			(elkLayout.edges as any[]).forEach((elkEdge: any) => {
				const layoutEdge: LayoutEdge = {
					source: elkEdge.sources?.[0] || '',
					target: elkEdge.targets?.[0] || '',
					label: elkEdge.label?.text,
					points: this.extractEdgePoints(elkEdge),
				};

				layoutEdges.push(layoutEdge);

				// Update bounds based on edge waypoints
				layoutEdge.points.forEach(([x, y]: [number, number]) => {
					minX = Math.min(minX, x);
					minY = Math.min(minY, y);
					maxX = Math.max(maxX, x);
					maxY = Math.max(maxY, y);
				});
			});
		}

		// Calculate final dimensions with padding
		const padding = 40;
		const contentWidth = isFinite(maxX - minX) ? maxX - minX : 800;
		const contentHeight = isFinite(maxY - minY) ? maxY - minY : 600;
		const width = Math.max(
			contentWidth + padding * 2,
			1200 // Minimum width for readability
		);
		const height = Math.max(
			contentHeight + padding * 2,
			800 // Minimum height for readability
		);

		// Normalize coordinates to start from padding
		const offsetX = isFinite(minX) ? padding - minX : padding;
		const offsetY = isFinite(minY) ? padding - minY : padding;

		layoutNodes.forEach((node) => {
			node.x += offsetX;
			node.y += offsetY;
		});

		layoutEdges.forEach((edge) => {
			edge.points = edge.points.map(([x, y]: [number, number]) => [x + offsetX, y + offsetY]);
		});

		// Add error nodes to the layout
		if (originalAst.errors && originalAst.errors.length > 0) {
			let errorY = offsetY + 20;
			const errorNodeWidth = 250;
			const errorNodeHeight = 80;
			const spacing = 20;

			originalAst.errors.forEach((error, index) => {
				const errorNode: LayoutNode = {
					id: `error-${index}`,
					label: error.message,
					type: 'error',
					x: offsetX + contentWidth - errorNodeWidth - 20,
					y: errorY,
					width: errorNodeWidth,
					height: errorNodeHeight,
					error: {
						message: error.message,
						type: error.type,
						line: error.line,
						column: error.column,
					},
				};

				layoutNodes.push(errorNode);
				errorY += errorNodeHeight + spacing;

				// Update bounds if necessary
				maxX = Math.max(maxX, errorNode.x + errorNode.width);
				maxY = Math.max(maxY, errorNode.y + errorNode.height);
			});

			// Recalculate bounds if error nodes extended beyond original bounds
			if (errorY > offsetY + contentHeight) {
				const newHeight = errorY - offsetY + padding;
				if (newHeight > height) {
					return this.transformElkLayoutToLayout(elkLayout, originalAst);
				}
			}
		}

		return {
			nodes: layoutNodes,
			edges: layoutEdges,
			width,
			height,
			computedAt: Date.now(),
		};
	}

	/**
	 * Extracts waypoints from ELK edge sections
	 * @param elkEdge - ELK edge with layout sections
	 * @returns Array of [x, y] coordinate pairs
	 */
	private extractEdgePoints(elkEdge: any): Array<[number, number]> {
		const points: Array<[number, number]> = [];

		if (!elkEdge.sections) {
			return points;
		}

		(elkEdge.sections as any[]).forEach((section: any) => {
			// Add start point
			if (section.startPoint) {
				points.push([section.startPoint.x, section.startPoint.y]);
			}

			// Add bend points
			if (section.bendPoints) {
				(section.bendPoints as any[]).forEach((bendPoint: any) => {
					points.push([bendPoint.x, bendPoint.y]);
				});
			}

			// Add end point
			if (section.endPoint) {
				points.push([section.endPoint.x, section.endPoint.y]);
			}
		});

		// If no sections, return empty array (edge will need manual routing)
		if (points.length === 0) {
			console.warn('[LayoutEngine] No points found for edge:', elkEdge.id);
		}

		return points;
	}

	/**
	 * Update layout configuration
	 * @param config - Partial configuration to merge
	 */
	updateConfig(config: Partial<LayoutConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current configuration
	 * @returns Current layout configuration
	 */
	getConfig(): LayoutConfig {
		return { ...this.config };
	}
}

/**
 * Singleton instance of LayoutEngine for use throughout the app
 */
let layoutEngineInstance: LayoutEngine | null = null;

/**
 * Get or create the singleton layout engine instance
 * @param config - Optional configuration for the engine
 * @returns Layout engine instance
 */
export function getLayoutEngine(config?: Partial<LayoutConfig>): LayoutEngine {
	if (!layoutEngineInstance) {
		layoutEngineInstance = new LayoutEngine(config);
	}
	return layoutEngineInstance;
}
