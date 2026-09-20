/**
 * AST to ELK graph format transformer
 * Converts parsed Module AST into ELK graph format suitable for layout
 */

import { ModuleJSON, BlockJSON, InstanceJSON, PortJSON, SignalJSON } from '../types/ast';
import {
	ELKGraph,
	ELKNode,
	ELKEdge,
	DEFAULT_ELK_LAYOUT_OPTIONS,
	DEFAULT_NODE_DIMENSIONS,
} from '../types/elk';
import { BlockType, BLOCK_TYPE_PROPERTIES } from '../types/block-type';

/**
 * Transforms an AST Module into an ELK graph
 */
export class ASTTransformer {
	private nodeIdCounter = 0;
	private nodeIdMap = new Map<string, string>();
	private usedNodeIds = new Set<string>();

	/**
	 * Transform a Module into an ELK graph
	 * @param module The parsed ModuleJSON from the parser
	 * @param blockTypes Map of block IDs to their detected types
	 * @returns ELK graph structure ready for layout
	 */
	public transform(module: ModuleJSON, blockTypes: Map<string, BlockType>): ELKGraph {
		this.resetState();

		const nodes: ELKNode[] = [];
		const edges: ELKEdge[] = [];

		// 1. Create nodes for module ports (as external connection points)
		const portNodes = this.createPortNodes(module.ports);
		nodes.push(...portNodes);

		// 2. Create nodes for instances
		const instanceNodes = this.createInstanceNodes(module.instances);
		nodes.push(...instanceNodes);

		// 3. Create nodes for blocks (combinational, sequential, FSM, memory)
		const blockNodes = this.createBlockNodes(module.blocks, blockTypes);
		nodes.push(...blockNodes);

		// 4. Create edges for signal connections
		const signalEdges = this.createSignalEdges(module, nodes);
		edges.push(...signalEdges);

		// 5. Build hierarchical parent-child relationships
		this.buildHierarchy(nodes, module);

		// Create the root ELK graph
		const graph: ELKGraph = {
			id: `graph_${module.name}`,
			label: module.name,
			nodes,
			edges,
			layoutOptions: DEFAULT_ELK_LAYOUT_OPTIONS,
			properties: {
				algorithm: 'org.eclipse.elk.layered',
				direction: 'DOWN',
			},
		};

		return graph;
	}

	/**
	 * Create nodes for module ports
	 */
	private createPortNodes(ports: PortJSON[]): ELKNode[] {
		return ports.map((port) => ({
			id: this.generateUniqueId(`port_${port.name}`),
			label: port.name,
			type: 'port',
			width: DEFAULT_NODE_DIMENSIONS.port.width,
			height: DEFAULT_NODE_DIMENSIONS.port.height,
			shape: 'parallelogram',
			color: port.direction === 'input' ? '#c8e6c9' : '#ffcccc',
			properties: {
				direction: port.direction,
				width: port.width || 1,
			},
		}));
	}

	/**
	 * Create nodes for module instances
	 */
	private createInstanceNodes(instances: InstanceJSON[]): ELKNode[] {
		return instances.map((instance) => ({
			id: this.generateUniqueId(`instance_${instance.name}`),
			label: instance.name,
			type: 'instance',
			width: DEFAULT_NODE_DIMENSIONS.instance.width,
			height: DEFAULT_NODE_DIMENSIONS.instance.height,
			shape: 'rectangle',
			color: '#e1f5fe',
			properties: {
				moduleName: instance.module,
				connections: instance.connections,
				parameters: instance.parameters,
			},
			children: [],
		}));
	}

	/**
	 * Create nodes for blocks (logic blocks in the module)
	 */
	private createBlockNodes(
		blocks: BlockJSON[],
		blockTypes: Map<string, BlockType>
	): ELKNode[] {
		const blockNodes: ELKNode[] = [];

		for (const block of blocks) {
			const blockId = block.id;
			const blockType = blockTypes.get(blockId) || BlockType.UNKNOWN;
			const props = BLOCK_TYPE_PROPERTIES[blockType];

			const nodeId = this.generateUniqueId(`block_${blockId}`);

			// Determine node shape and properties based on block type
			let shape: 'rectangle' | 'circle' | 'diamond' = 'rectangle';
			if (blockType === BlockType.STATE_MACHINE) {
				shape = 'circle';
			}

			blockNodes.push({
				id: nodeId,
				label: `${blockType} (${block.type})`,
				type: blockType,
				shape,
				width: shape === 'circle'
					? DEFAULT_NODE_DIMENSIONS.state.width
					: DEFAULT_NODE_DIMENSIONS.block.width,
				height: shape === 'circle'
					? DEFAULT_NODE_DIMENSIONS.state.height
					: DEFAULT_NODE_DIMENSIONS.block.height,
				color: props.color,
				pattern: props.pattern,
				properties: {
					blockType: block.type,
					inputs: block.inputs || [],
					outputs: block.outputs || [],
					clk: block.clk,
					reset: block.reset,
					line: block.line,
				},
			});
		}

		return blockNodes;
	}

	/**
	 * Create edges for signal connections
	 */
	private createSignalEdges(module: ModuleJSON, nodes: ELKNode[]): ELKEdge[] {
		const edges: ELKEdge[] = [];
		const edgeSet = new Set<string>();

		// Create a map of signal names to their properties
		const signalMap = new Map<string, SignalJSON>();
		for (const signal of module.signals) {
			signalMap.set(signal.name, signal);
		}

		// Add module ports to signal map
		for (const port of module.ports) {
			const signal: SignalJSON = {
				name: port.name,
				type: 'wire',
				width: port.width || 1,
			};
			signalMap.set(port.name, signal);
		}

		// Process blocks to extract signal connections
		for (const block of module.blocks) {
			const blockNode = nodes.find((n) => n.properties?.blockType === block.type);
			if (!blockNode) continue;

			// Connect inputs to sources
			if (block.inputs) {
				for (const input of block.inputs) {
					const sourceNode = this.findNodeBySignalName(nodes, input);
					if (sourceNode && sourceNode.id !== blockNode.id) {
						const edgeId = this.generateUniqueEdgeId(sourceNode.id, blockNode.id, input);
						if (!edgeSet.has(edgeId)) {
							const signal = signalMap.get(input);
							edges.push({
								id: edgeId,
								source: sourceNode.id,
								target: blockNode.id,
								label: input,
								width: signal?.width,
								style: 'solid',
							});
							edgeSet.add(edgeId);
						}
					}
				}
			}

			// Connect outputs to destinations
			if (block.outputs) {
				for (const output of block.outputs) {
					const destNode = this.findNodeBySignalName(nodes, output);
					if (destNode && destNode.id !== blockNode.id) {
						const edgeId = this.generateUniqueEdgeId(blockNode.id, destNode.id, output);
						if (!edgeSet.has(edgeId)) {
							const signal = signalMap.get(output);
							edges.push({
								id: edgeId,
								source: blockNode.id,
								target: destNode.id,
								label: output,
								width: signal?.width,
								style: 'solid',
							});
							edgeSet.add(edgeId);
						}
					}
				}
			}
		}

		// Process instance connections
		for (const instance of module.instances) {
			const instanceNode = nodes.find((n) => n.properties?.moduleName === instance.module);
			if (!instanceNode) continue;

			// Connections can be either an array of {port, signal} or a map {port: signal}
			const connArray = Array.isArray(instance.connections)
				? instance.connections
				: instance.connections
				? Object.entries(instance.connections).map(([port, signal]) => ({ port, signal }))
				: [];

			for (const conn of connArray) {
				const signalName = typeof conn === 'string' ? conn : conn.signal;
				const signalNode = this.findNodeBySignalName(nodes, signalName);
				if (signalNode && signalNode.id !== instanceNode.id) {
					const signal = signalMap.get(signalName);
					const edgeId = this.generateUniqueEdgeId(
						signalNode.id,
						instanceNode.id,
						signalName
					);

					if (!edgeSet.has(edgeId)) {
						const port = typeof conn === 'string' ? '' : conn.port;
						edges.push({
							id: edgeId,
							source: signalNode.id,
							target: instanceNode.id,
							label: port ? `${signalName} → ${port}` : signalName,
							width: signal?.width,
							style: 'solid',
						});
						edgeSet.add(edgeId);
					}
				}
			}
		}

		return edges;
	}

	/**
	 * Find a node by signal name
	 */
	private findNodeBySignalName(nodes: ELKNode[], signalName: string): ELKNode | undefined {
		return nodes.find((n) => n.label === signalName || n.properties?.name === signalName);
	}

	/**
	 * Build hierarchical parent-child relationships
	 */
	private buildHierarchy(nodes: ELKNode[], module: ModuleJSON): void {
		// For now, instances can be parents of blocks if they have matching module names
		// This is a simplified hierarchy structure for Phase 1.1
		// In a full implementation, this would traverse the parsed module hierarchy

		// Group blocks by module/hierarchy
		// Since we don't have full hierarchy info in the current AST,
		// we'll use a flat structure that can be enhanced later
	}

	/**
	 * Generate a unique node ID
	 */
	private generateUniqueId(baseName: string): string {
		// Check if we already have an ID for this base name
		if (this.nodeIdMap.has(baseName)) {
			return this.nodeIdMap.get(baseName)!;
		}

		// Generate new unique ID
		let id = baseName;
		let counter = 1;

		while (this.usedNodeIds.has(id)) {
			id = `${baseName}_${counter}`;
			counter++;
		}

		this.usedNodeIds.add(id);
		this.nodeIdMap.set(baseName, id);
		return id;
	}

	/**
	 * Generate a unique edge ID
	 */
	private generateUniqueEdgeId(source: string, target: string, label: string): string {
		return `edge_${source}_${target}_${label}`;
	}

	/**
	 * Reset internal state for next transformation
	 */
	private resetState(): void {
		this.nodeIdCounter = 0;
		this.nodeIdMap.clear();
		this.usedNodeIds.clear();
	}
}

/**
 * Helper function to detect block types from a module
 * This is a simplified implementation; use BlockTypeDetector from block-type-detector.ts for production
 */
export function detectBlockTypes(module: ModuleJSON): Map<string, BlockType> {
	const blockTypes = new Map<string, BlockType>();

	// Check if module is hierarchical (only instances, no blocks)
	if (module.instances.length > 0 && module.blocks.length === 0) {
		// All instances get HIERARCHICAL_CONTAINER
		return blockTypes;
	}

	// Check each block for its type
	for (const block of module.blocks) {
		const blockId = block.id;

		// Determine block type based on block type field
		if (block.type === 'always_ff') {
			blockTypes.set(blockId, BlockType.SEQUENTIAL_LOGIC);
		} else if (block.type === 'always_comb' || block.type === 'assign') {
			blockTypes.set(blockId, BlockType.COMBINATIONAL_LOGIC);
		} else {
			blockTypes.set(blockId, BlockType.UNKNOWN);
		}
	}

	return blockTypes;
}
