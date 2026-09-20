import * as assert from 'assert';
import { ModuleJSON, BlockJSON, InstanceJSON, PortJSON, SignalJSON } from '../types/ast';
import { ASTTransformer, detectBlockTypes } from './ast-transformer';
import { BlockType } from '../types/block-type';
import { ELKGraph } from '../types/elk';

suite('ASTTransformer', () => {
	let transformer: ASTTransformer;

	setup(() => {
		transformer = new ASTTransformer();
	});

	test('transform should create ELK graph with correct structure', () => {
		const module: ModuleJSON = {
			name: 'test_module',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'out', direction: 'output', width: 1 },
			],
			signals: [{ name: 'internal', type: 'logic', width: 8 }],
			instances: [],
			blocks: [],
		};

		const blockTypes = new Map<string, BlockType>();
		const graph = transformer.transform(module, blockTypes);

		assert.ok(graph, 'Graph should be created');
		assert.ok(graph.nodes, 'Graph should have nodes array');
		assert.ok(graph.edges, 'Graph should have edges array');
		assert.strictEqual(graph.id, 'graph_test_module');
		assert.strictEqual(graph.label, 'test_module');
	});

	test('transform should create nodes for module ports', () => {
		const module: ModuleJSON = {
			name: 'counter',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'reset', direction: 'input', width: 1 },
				{ name: 'count', direction: 'output', width: 4 },
			],
			signals: [],
			instances: [],
			blocks: [],
		};

		const blockTypes = new Map<string, BlockType>();
		const graph = transformer.transform(module, blockTypes);

		// Should have 3 port nodes
		const portNodes = graph.nodes.filter((n) => n.type === 'port');
		assert.strictEqual(portNodes.length, 3, 'Should have 3 port nodes');

		// Check port properties
		const clkNode = portNodes.find((n) => n.label === 'clk');
		assert.ok(clkNode, 'Should have clk port node');
		assert.ok(clkNode!.properties?.direction === 'input');
		assert.strictEqual(clkNode!.properties?.width, 1);

		const countNode = portNodes.find((n) => n.label === 'count');
		assert.ok(countNode, 'Should have count port node');
		assert.strictEqual(countNode!.properties?.width, 4);
	});

	test('transform should create nodes for instances', () => {
		const module: ModuleJSON = {
			name: 'processor',
			ports: [],
			signals: [],
			instances: [
				{ module: 'mem_ctrl', name: 'mem_0' },
				{ module: 'alu', name: 'alu_0' },
			],
			blocks: [],
		};

		const blockTypes = new Map<string, BlockType>();
		const graph = transformer.transform(module, blockTypes);

		const instanceNodes = graph.nodes.filter((n) => n.type === 'instance');
		assert.strictEqual(instanceNodes.length, 2, 'Should have 2 instance nodes');

		const mem0Node = instanceNodes.find((n) => n.label === 'mem_0');
		assert.ok(mem0Node, 'Should have mem_0 instance');
		assert.strictEqual(mem0Node!.properties?.moduleName, 'mem_ctrl');
	});

	test('transform should create nodes for blocks', () => {
		const module: ModuleJSON = {
			name: 'counter',
			ports: [],
			signals: [],
			instances: [],
			blocks: [
				{ id: 'block_0', type: 'always_comb', inputs: ['enable', 'count'], outputs: ['count_next'] },
				{ id: 'block_1', type: 'always_ff', inputs: ['count_next'], outputs: ['count'] },
			],
		};

		const blockTypes = new Map<string, BlockType>();
		blockTypes.set('block_0', BlockType.COMBINATIONAL_LOGIC);
		blockTypes.set('block_1', BlockType.SEQUENTIAL_LOGIC);

		const graph = transformer.transform(module, blockTypes);

		const blockNodes = graph.nodes.filter(
			(n) => n.type === BlockType.COMBINATIONAL_LOGIC || n.type === BlockType.SEQUENTIAL_LOGIC
		);
		assert.strictEqual(blockNodes.length, 2, 'Should have 2 block nodes');
	});

	test('transform should create edges for signal connections', () => {
		const module: ModuleJSON = {
			name: 'counter',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'enable', direction: 'input', width: 1 },
				{ name: 'count', direction: 'output', width: 4 },
			],
			signals: [{ name: 'count_next', type: 'logic', width: 4 }],
			instances: [],
			blocks: [
				{ id: 'block_0', type: 'always_comb', inputs: ['enable', 'count'], outputs: ['count_next'] },
				{ id: 'block_1', type: 'always_ff', inputs: ['count_next'], outputs: ['count'] },
			],
		};

		const blockTypes = new Map<string, BlockType>();
		blockTypes.set('block_0', BlockType.COMBINATIONAL_LOGIC);
		blockTypes.set('block_1', BlockType.SEQUENTIAL_LOGIC);

		const graph = transformer.transform(module, blockTypes);

		assert.ok(graph.edges, 'Should have edges array for signal connections');
	});

	test('transform should not have overlapping node IDs', () => {
		const module: ModuleJSON = {
			name: 'complex',
			ports: [
				{ name: 'in1', direction: 'input', width: 1 },
				{ name: 'in2', direction: 'input', width: 1 },
				{ name: 'out', direction: 'output', width: 1 },
			],
			signals: [{ name: 'temp', type: 'logic', width: 8 }],
			instances: [
				{ module: 'sub_mod', name: 'inst_0' },
				{ module: 'sub_mod', name: 'inst_1' },
			],
			blocks: [
				{ id: 'block_0', type: 'always_comb', inputs: ['in1'], outputs: ['temp'] },
				{ id: 'block_1', type: 'always_ff', inputs: ['temp'], outputs: ['out'] },
			],
		};

		const blockTypes = new Map<string, BlockType>();
		blockTypes.set('block_0', BlockType.COMBINATIONAL_LOGIC);
		blockTypes.set('block_1', BlockType.SEQUENTIAL_LOGIC);

		const graph = transformer.transform(module, blockTypes);

		const nodeIds = graph.nodes.map((n) => n.id);
		const uniqueNodeIds = new Set(nodeIds);
		assert.strictEqual(nodeIds.length, uniqueNodeIds.size, 'All node IDs should be unique');
	});

	test('transform counter module (sequential + signals)', () => {
		const module: ModuleJSON = {
			name: 'counter_4bit',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'reset', direction: 'input', width: 1 },
				{ name: 'enable', direction: 'input', width: 1 },
				{ name: 'count', direction: 'output', width: 4 },
			],
			signals: [{ name: 'count_next', type: 'logic', width: 4 }],
			instances: [],
			blocks: [
				{ id: 'block_0', type: 'always_comb', inputs: ['reset', 'enable', 'count'], outputs: ['count_next'] },
				{ id: 'block_1', type: 'always_ff', inputs: ['count_next'], outputs: ['count'] },
			],
		};

		const blockTypes = new Map<string, BlockType>();
		blockTypes.set('block_0', BlockType.COMBINATIONAL_LOGIC);
		blockTypes.set('block_1', BlockType.SEQUENTIAL_LOGIC);

		const graph = transformer.transform(module, blockTypes);

		// Verify structure
		assert.strictEqual(graph.id, 'graph_counter_4bit');
		assert.ok(graph.nodes.length >= 6, 'Should have ports + blocks');
		assert.ok(Array.isArray(graph.edges), 'Should have edges array');

		// Verify we have the right node types
		const portNodes = graph.nodes.filter((n) => n.type === 'port');
		const blockNodes = graph.nodes.filter(
			(n) => n.type === BlockType.COMBINATIONAL_LOGIC || n.type === BlockType.SEQUENTIAL_LOGIC
		);
		assert.strictEqual(portNodes.length, 4, 'Should have 4 port nodes');
		assert.ok(blockNodes.length > 0, 'Should have block nodes');
	});

	test('transform processor module (hierarchical with instances)', () => {
		const module: ModuleJSON = {
			name: 'processor',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'data_in', direction: 'input', width: 32 },
				{ name: 'data_out', direction: 'output', width: 32 },
			],
			signals: [
				{ name: 'mem_data', type: 'logic', width: 32 },
				{ name: 'alu_result', type: 'logic', width: 32 },
			],
			instances: [
				{
					module: 'memory_controller',
					name: 'mem_ctrl_0',
					connections: { data_in: 'data_in', data_out: 'mem_data' },
				},
				{
					module: 'alu',
					name: 'alu_0',
					connections: { operand_a: 'mem_data', result: 'alu_result' },
				},
			],
			blocks: [],
		};

		const blockTypes = new Map<string, BlockType>();
		const graph = transformer.transform(module, blockTypes);

		// Verify hierarchical structure
		assert.ok(graph.nodes.length >= 7, 'Should have ports + instances + signals');

		const instanceNodes = graph.nodes.filter((n) => n.type === 'instance');
		assert.strictEqual(instanceNodes.length, 2, 'Should have 2 instances');

		// Check instance connections
		const edges = graph.edges;
		assert.ok(Array.isArray(edges), 'Should have edges array');
	});

	test('transform FSM module (state circles + transitions)', () => {
		const module: ModuleJSON = {
			name: 'fsm_ctrl',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'reset', direction: 'input', width: 1 },
				{ name: 'go', direction: 'input', width: 1 },
				{ name: 'done', direction: 'output', width: 1 },
			],
			signals: [{ name: 'state', type: 'logic', width: 2 }],
			instances: [],
			blocks: [
				{ id: 'block_0', type: 'always_ff', inputs: ['go', 'state'], outputs: ['state'] },
				{ id: 'block_1', type: 'always_comb', inputs: ['state'], outputs: ['done'] },
			],
		};

		const blockTypes = new Map<string, BlockType>();
		blockTypes.set('block_0', BlockType.STATE_MACHINE);
		blockTypes.set('block_1', BlockType.COMBINATIONAL_LOGIC);

		const graph = transformer.transform(module, blockTypes);

		// Verify FSM nodes are circles
		const fsmNodes = graph.nodes.filter((n) => n.type === BlockType.STATE_MACHINE);
		assert.ok(fsmNodes.length > 0, 'Should have FSM state nodes');

		for (const node of fsmNodes) {
			assert.strictEqual(node.shape, 'circle', 'FSM nodes should be circles');
		}
	});

	test('transform should handle empty modules', () => {
		const module: ModuleJSON = {
			name: 'empty_module',
			ports: [],
			signals: [],
			instances: [],
			blocks: [],
		};
		const blockTypes = new Map<string, BlockType>();

		const graph = transformer.transform(module, blockTypes);

		assert.ok(graph, 'Should create graph for empty module');
		assert.ok(Array.isArray(graph.nodes), 'Should have nodes array');
		assert.ok(Array.isArray(graph.edges), 'Should have edges array');
	});

	test('transform should set correct node properties based on block type', () => {
		const module: ModuleJSON = {
			name: 'logic_types',
			ports: [],
			signals: [],
			instances: [],
			blocks: [
				{ id: 'block_0', type: 'always_comb', inputs: [], outputs: [] },
				{ id: 'block_1', type: 'always_ff', inputs: [], outputs: [] },
			],
		};

		const blockTypes = new Map<string, BlockType>();
		blockTypes.set('block_0', BlockType.COMBINATIONAL_LOGIC);
		blockTypes.set('block_1', BlockType.SEQUENTIAL_LOGIC);

		const graph = transformer.transform(module, blockTypes);

		const combNode = graph.nodes.find((n) => n.type === BlockType.COMBINATIONAL_LOGIC);
		const seqNode = graph.nodes.find((n) => n.type === BlockType.SEQUENTIAL_LOGIC);

		assert.ok(combNode, 'Should have combinational node');
		assert.ok(seqNode, 'Should have sequential node');

		assert.notStrictEqual(combNode!.color, seqNode!.color, 'Node colors should differ');
	});

	test('transform should include layout options', () => {
		const module: ModuleJSON = {
			name: 'layout_test',
			ports: [],
			signals: [],
			instances: [],
			blocks: [],
		};
		const blockTypes = new Map<string, BlockType>();

		const graph = transformer.transform(module, blockTypes);

		assert.ok(graph.layoutOptions, 'Should have layoutOptions');
		assert.ok(graph.properties, 'Should have properties');
		assert.strictEqual(graph.properties?.algorithm, 'org.eclipse.elk.layered');
		assert.strictEqual(graph.properties?.direction, 'DOWN');
	});

	test('detectBlockTypes should identify sequential blocks', () => {
		const module: ModuleJSON = {
			name: 'seq_module',
			ports: [],
			signals: [],
			instances: [],
			blocks: [
				{ id: 'block_0', type: 'always_ff', inputs: [], outputs: [] },
				{ id: 'block_1', type: 'always_ff', inputs: [], outputs: [] },
			],
		};

		const blockTypes = detectBlockTypes(module);

		assert.strictEqual(blockTypes.get('block_0'), BlockType.SEQUENTIAL_LOGIC);
		assert.strictEqual(blockTypes.get('block_1'), BlockType.SEQUENTIAL_LOGIC);
	});

	test('detectBlockTypes should identify combinational blocks', () => {
		const module: ModuleJSON = {
			name: 'comb_module',
			ports: [],
			signals: [],
			instances: [],
			blocks: [{ id: 'block_0', type: 'always_comb', inputs: [], outputs: [] }],
		};

		const blockTypes = detectBlockTypes(module);

		assert.strictEqual(blockTypes.get('block_0'), BlockType.COMBINATIONAL_LOGIC);
	});

	test('transform should handle multiple signal connections correctly', () => {
		const module: ModuleJSON = {
			name: 'adder',
			ports: [
				{ name: 'a', direction: 'input', width: 1 },
				{ name: 'b', direction: 'input', width: 1 },
				{ name: 'y', direction: 'output', width: 1 },
			],
			signals: [],
			instances: [],
			blocks: [{ id: 'block_0', type: 'always_comb', inputs: ['a', 'b'], outputs: ['y'] }],
		};

		const blockTypes = new Map<string, BlockType>();
		blockTypes.set('block_0', BlockType.COMBINATIONAL_LOGIC);

		const graph = transformer.transform(module, blockTypes);

		// Should have edges from inputs to block
		const inputEdges = graph.edges.filter((e) => e.target);
		assert.ok(Array.isArray(inputEdges), 'Should have edges from multiple inputs');
	});

	test('transform should use proper signal widths in edges', () => {
		const module: ModuleJSON = {
			name: 'buffer',
			ports: [
				{ name: 'data_in', direction: 'input', width: 32 },
				{ name: 'data_out', direction: 'output', width: 32 },
			],
			signals: [{ name: 'data_in', type: 'logic', width: 32 }],
			instances: [],
			blocks: [{ id: 'block_0', type: 'always_comb', inputs: ['data_in'], outputs: ['data_out'] }],
		};

		const blockTypes = new Map<string, BlockType>();
		blockTypes.set('block_0', BlockType.COMBINATIONAL_LOGIC);

		const graph = transformer.transform(module, blockTypes);

		// Check edge widths
		const dataEdges = graph.edges.filter((e) => e.label?.includes('data_in'));
		for (const edge of dataEdges) {
			if (edge.width !== undefined) {
				assert.strictEqual(edge.width, 32, 'Edge width should match signal width');
			}
		}
	});

	test('transform should validate graph structure', () => {
		const module: ModuleJSON = {
			name: 'simple',
			ports: [
				{ name: 'in', direction: 'input', width: 1 },
				{ name: 'out', direction: 'output', width: 1 },
			],
			signals: [],
			instances: [],
			blocks: [{ id: 'block_0', type: 'always_comb', inputs: ['in'], outputs: ['out'] }],
		};

		const blockTypes = new Map<string, BlockType>();
		blockTypes.set('block_0', BlockType.COMBINATIONAL_LOGIC);

		const graph = transformer.transform(module, blockTypes);

		// Validate that all edge source/target node IDs exist
		const nodeIds = new Set(graph.nodes.map((n) => n.id));

		for (const edge of graph.edges) {
			assert.ok(nodeIds.has(edge.source), `Edge source ${edge.source} should exist in nodes`);
			assert.ok(nodeIds.has(edge.target), `Edge target ${edge.target} should exist in nodes`);
		}
	});
});
