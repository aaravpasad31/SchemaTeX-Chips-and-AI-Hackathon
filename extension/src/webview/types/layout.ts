/**
 * Type definitions for layout engine output.
 * These represent the final positioned coordinates of nodes and edges
 * ready for SVG rendering.
 */

/**
 * Complete layout information for a diagram
 */
export interface Layout {
	/** Positioned nodes with coordinates */
	nodes: LayoutNode[];
	/** Routed edges with waypoints */
	edges: LayoutEdge[];
	/** Overall diagram dimensions */
	width: number;
	height: number;
	/** Timestamp when layout was computed */
	computedAt: number;
}

/**
 * A positioned node in the diagram
 */
export interface LayoutNode {
	/** Unique identifier matching the parser output */
	id: string;
	/** Display label */
	label: string;
	/** Node type: 'module', 'port', 'logic', 'instance', 'error' */
	type: 'module' | 'port' | 'logic' | 'instance' | 'signal' | 'error';
	/** X coordinate (top-left corner) */
	x: number;
	/** Y coordinate (top-left corner) */
	y: number;
	/** Width of the node */
	width: number;
	/** Height of the node */
	height: number;
	/** Parent node ID for hierarchical layouts (nested modules) */
	parent?: string;
	/** Port side for port nodes: 'NORTH', 'SOUTH', 'EAST', 'WEST' */
	portSide?: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
	/** Index of ports on the same side */
	portIndex?: number;
	/** Error information if this is an error node */
	error?: {
		/** Error message */
		message: string;
		/** Error type */
		type: 'parse-error' | 'unsupported' | 'warning';
		/** Line number from source */
		line?: number;
		/** Column number from source */
		column?: number;
	};
}

/**
 * A routed edge in the diagram
 */
export interface LayoutEdge {
	/** Source node ID */
	source: string;
	/** Target node ID */
	target: string;
	/** Edge label (signal name, etc.) */
	label?: string;
	/** Waypoints for edge routing: array of [x, y] coordinates */
	points: Array<[number, number]>;
	/** Edge type for styling */
	type?: 'signal' | 'clock' | 'reset' | 'control';
}

/**
 * ELK graph format for internal use
 */
export interface ElkGraph {
	id: string;
	label?: string;
	layoutOptions?: Record<string, string | number | boolean>;
	children?: ElkNode[];
	nodes?: ElkNode[];  // Alternative property name
	edges?: ElkEdge[];
	width?: number;
	height?: number;
	[key: string]: any;  // Allow additional properties
}

/**
 * ELK node format
 */
export interface ElkNode {
	id: string;
	label?: { text: string } | string;
	width?: number;
	height?: number;
	x?: number;
	y?: number;
	type?: string;  // Block type for rendering
	color?: string;  // Fill color
	shape?: string;  // Node shape
	layoutOptions?: Record<string, string | number | boolean>;
	children?: ElkNode[];
	ports?: ElkPort[];
	properties?: Record<string, any>;
	[key: string]: any;  // Allow additional properties
}

/**
 * ELK port format for hierarchical structures
 */
export interface ElkPort {
	id: string;
	label?: { text: string } | string;
	width?: number;
	height?: number;
	x?: number;
	y?: number;
	properties?: Record<string, any>;
	[key: string]: any;  // Allow additional properties
}

/**
 * ELK edge format
 */
export interface ElkEdge {
	id: string;
	sources?: string[];
	targets?: string[];
	source?: string;  // Alternative source property
	target?: string;  // Alternative target property
	label?: { text: string } | string;
	width?: number;  // Bus width for rendering
	points?: Array<{ x: number; y: number }>;  // Routing points
	layoutOptions?: Record<string, string | number | boolean>;
	sections?: Array<{
		startPoint: { x: number; y: number };
		endPoint: { x: number; y: number };
		bendPoints?: Array<{ x: number; y: number }>;
	}>;
	[key: string]: any;  // Allow additional properties
}
