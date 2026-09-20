/**
 * ELK (Eclipse Layout Kernel) graph format types
 * Used for hierarchical layout of RTL diagrams
 */

/**
 * ELK Node with metadata for RTL visualization
 */
export interface ELKNode {
	id: string;
	label: string;
	width?: number;
	height?: number;
	x?: number;
	y?: number;

	// RTL-specific metadata
	type?: string;  // BlockType enum value
	shape?: 'rectangle' | 'circle' | 'diamond' | 'parallelogram';
	color?: string;
	pattern?: 'solid' | 'hatch' | 'dots';

	// Hierarchy support
	children?: ELKNode[];
	layoutOptions?: Record<string, any>;

	// Port information
	ports?: ELKPort[];

	// Additional metadata
	[key: string]: any;
}

/**
 * ELK Port (connection point on a node)
 */
export interface ELKPort {
	id: string;
	label?: string;
	width?: number;
	height?: number;
	x?: number;
	y?: number;
	properties?: Record<string, any>;
}

/**
 * ELK Edge (connection between nodes)
 */
export interface ELKEdge {
	id: string;
	source: string;
	target: string;
	sourcePort?: string;
	targetPort?: string;
	label?: string;
	width?: number;  // for bus width

	// Visual properties
	style?: 'solid' | 'dashed' | 'dotted';

	// Layout hints
	layoutOptions?: Record<string, any>;

	// Routing points for visualization
	points?: Array<{ x: number; y: number }>;

	[key: string]: any;
}

/**
 * Complete ELK graph structure
 */
export interface ELKGraph {
	id: string;
	label?: string;
	nodes: ELKNode[];
	edges: ELKEdge[];

	// Layout configuration
	layoutOptions?: Record<string, any>;

	// ELK algorithm selection and parameters
	properties?: {
		algorithm?: string;
		direction?: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
		spacingNodeNode?: number;
		spacingEdgeNode?: number;
		spacingEdgeEdge?: number;
		separateConnectedComponents?: boolean;
		[key: string]: any;
	};

	[key: string]: any;
}

/**
 * Default layout options for hierarchical RTL layout
 */
export const DEFAULT_ELK_LAYOUT_OPTIONS: Record<string, any> = {
	algorithm: 'org.eclipse.elk.layered',
	direction: 'DOWN',
	spacing: {
		nodeNode: 40,
		edgeNode: 20,
		edgeEdge: 15,
		componentComponent: 40,
	},
	cycleBreaking: {
		strategy: 'DEPTH_FIRST',
	},
	layering: {
		strategy: 'NETWORK_SIMPLEX',
		layerConstraint: 'FORCE_LAYER',
	},
	crossing: {
		strategy: 'LAYER_SWEEP',
	},
	edgeRouting: 'ORTHOGONAL',
	separateConnectedComponents: true,
};

/**
 * Default node dimensions
 */
export const DEFAULT_NODE_DIMENSIONS = {
	block: { width: 120, height: 80 },
	state: { width: 60, height: 60 },
	instance: { width: 150, height: 100 },
	port: { width: 20, height: 20 },
};

/**
 * Port direction constants
 */
export enum PortDirection {
	INPUT = 'input',
	OUTPUT = 'output',
	INOUT = 'inout',
	INTERNAL = 'internal',
}
