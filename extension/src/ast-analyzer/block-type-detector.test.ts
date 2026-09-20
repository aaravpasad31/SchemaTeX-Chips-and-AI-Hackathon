/**
 * Tests for BlockTypeDetector
 * Verifies correct classification of 6 module types
 */

import * as assert from 'assert';
import * as mocha from 'mocha';
import { detectBlockType, BlockType } from './block-type-detector';
import { ModuleJSON } from '../types/ast';

suite('BlockTypeDetector', () => {
	/**
	 * Test 1: COMBINATIONAL - Decoder logic with only always_comb
	 */
	mocha.test('detects COMBINATIONAL logic (2-to-4 decoder)', () => {
		const module: ModuleJSON = {
			name: 'decoder_2to4',
			ports: [
				{ name: 'sel', direction: 'input', width: 2 },
				{ name: 'out', direction: 'output', width: 4 },
			],
			signals: [],
			blocks: [
				{
					id: 'block_0',
					type: 'always_comb',
					inputs: ['sel'],
					outputs: ['out'],
				},
			],
			instances: [],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.COMBINATIONAL, 'Should detect COMBINATIONAL logic');
	});

	/**
	 * Test 2: SEQUENTIAL - Counter with always_ff block
	 * Based on counter_4bit.sv example
	 */
	mocha.test('detects SEQUENTIAL logic (4-bit counter)', () => {
		const module: ModuleJSON = {
			name: 'counter_4bit',
			filepath: 'counter_4bit.sv',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'reset', direction: 'input', width: 1 },
				{ name: 'enable', direction: 'input', width: 1 },
				{ name: 'count', direction: 'output', width: 4 },
			],
			signals: [{ name: 'count_next', type: 'logic', width: 4 }],
			blocks: [
				{
					id: 'block_0',
					type: 'always_comb',
					inputs: ['reset', 'enable', 'count'],
					outputs: ['count_next'],
				},
				{
					id: 'block_1',
					type: 'always_ff',
					inputs: ['count_next'],
					outputs: ['count'],
					clk: 'clk',
				},
			],
			instances: [],
			parameters: [],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.SEQUENTIAL, 'Should detect SEQUENTIAL logic with always_ff');
	});

	/**
	 * Test 3: HIERARCHICAL - Processor with module instances, no logic
	 */
	mocha.test('detects HIERARCHICAL design (processor with ALU, register file)', () => {
		const module: ModuleJSON = {
			name: 'processor',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'reset', direction: 'input', width: 1 },
				{ name: 'instruction', direction: 'input', width: 32 },
				{ name: 'result', direction: 'output', width: 32 },
			],
			signals: [
				{ name: 'alu_result', type: 'logic', width: 32 },
				{ name: 'reg_data', type: 'logic', width: 32 },
				{ name: 'opcode', type: 'logic', width: 8 },
			],
			blocks: [],
			instances: [
				{
					name: 'alu_inst',
					module: 'alu',
					connections: {
						a: 'reg_data',
						b: 'alu_result',
						opcode: 'opcode',
					},
				},
				{
					name: 'regfile_inst',
					module: 'register_file',
					connections: {
						clk: 'clk',
						data: 'result',
					},
				},
			],
			parameters: [],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.HIERARCHICAL, 'Should detect HIERARCHICAL design');
	});

	/**
	 * Test 4: STATE_MACHINE - FSM with enum state register and transitions
	 */
	mocha.test('detects STATE_MACHINE (traffic light FSM)', () => {
		const module: ModuleJSON = {
			name: 'traffic_fsm',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'reset', direction: 'input', width: 1 },
				{ name: 'sensor', direction: 'input', width: 1 },
				{ name: 'light', direction: 'output', width: 2 },
			],
			signals: [
				{ name: 'state', type: 'logic', width: 2 }, // State register
				{ name: 'next_state', type: 'logic', width: 2 }, // Next state
				{ name: 'light_temp', type: 'logic', width: 2 },
			],
			blocks: [
				{
					id: 'block_0',
					type: 'always_comb',
					inputs: ['state', 'sensor'],
					outputs: ['next_state', 'light_temp'],
				},
				{
					id: 'block_1',
					type: 'always_ff',
					inputs: ['next_state'],
					outputs: ['state'],
					clk: 'clk',
				},
				{
					id: 'block_2',
					type: 'assign',
					inputs: ['light_temp'],
					outputs: ['light'],
				},
			],
			instances: [],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.STATE_MACHINE, 'Should detect STATE_MACHINE');
	});

	/**
	 * Test 5: MEMORY - Module with array signals and read/write patterns
	 */
	mocha.test('detects MEMORY (single-port RAM)', () => {
		const module: ModuleJSON = {
			name: 'single_port_ram',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'we', direction: 'input', width: 1 },
				{ name: 'addr', direction: 'input', width: 8 },
				{ name: 'data_in', direction: 'input', width: 32 },
				{ name: 'data_out', direction: 'output', width: 32 },
			],
			signals: [
				{ name: 'mem', type: 'logic', width: 32, isArray: true, arraySize: 256 }, // Array memory
				{ name: 'data_reg', type: 'logic', width: 32 },
			],
			blocks: [
				{
					id: 'block_0',
					type: 'always_ff',
					inputs: ['clk', 'we', 'addr', 'data_in', 'mem'],
					outputs: ['mem', 'data_reg'], // Read/write to array
					clk: 'clk',
				},
				{
					id: 'block_1',
					type: 'assign',
					inputs: ['data_reg'],
					outputs: ['data_out'],
				},
			],
			instances: [],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.MEMORY, 'Should detect MEMORY pattern');
	});

	/**
	 * Test 6: MIXED - Module with both instances and logic blocks
	 */
	mocha.test('detects MIXED design (hierarchy + logic)', () => {
		const module: ModuleJSON = {
			name: 'mixed_system',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'reset', direction: 'input', width: 1 },
				{ name: 'data_in', direction: 'input', width: 32 },
				{ name: 'data_out', direction: 'output', width: 32 },
			],
			signals: [
				{ name: 'alu_result', type: 'logic', width: 32 },
				{ name: 'stored_data', type: 'logic', width: 32 },
				{ name: 'control', type: 'logic', width: 8 },
			],
			blocks: [
				{
					id: 'block_0',
					type: 'always_comb',
					inputs: ['alu_result', 'data_in'],
					outputs: ['control'],
				},
				{
					id: 'block_1',
					type: 'always_ff',
					inputs: ['alu_result'],
					outputs: ['stored_data'],
					clk: 'clk',
				},
			],
			instances: [
				{
					name: 'alu_inst',
					module: 'alu',
					connections: {
						a: 'data_in',
						b: 'stored_data',
						result: 'alu_result',
					},
				},
			],
			parameters: [],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.MIXED, 'Should detect MIXED design');
	});

	/**
	 * Test 7: Edge case - Empty module
	 */
	mocha.test('handles empty module (no blocks, no instances)', () => {
		const module: ModuleJSON = {
			name: 'empty_module',
			ports: [],
			signals: [],
			blocks: [],
			instances: [],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.COMBINATIONAL, 'Empty module defaults to COMBINATIONAL');
	});

	/**
	 * Test 8: Edge case - Assign statements only
	 */
	mocha.test('handles assign statements as combinational', () => {
		const module: ModuleJSON = {
			name: 'simple_assign',
			ports: [
				{ name: 'a', direction: 'input', width: 1 },
				{ name: 'b', direction: 'output', width: 1 },
			],
			signals: [],
			blocks: [
				{
					id: 'block_0',
					type: 'assign',
					inputs: ['a'],
					outputs: ['b'],
				},
			],
			instances: [],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.COMBINATIONAL, 'Assign statements are COMBINATIONAL');
	});

	/**
	 * Test 9: State machine with current_state naming convention
	 */
	mocha.test('detects state machine with current_state/next_state naming', () => {
		const module: ModuleJSON = {
			name: 'mealy_fsm',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'reset', direction: 'input', width: 1 },
				{ name: 'input_signal', direction: 'input', width: 1 },
				{ name: 'output_signal', direction: 'output', width: 1 },
			],
			signals: [
				{ name: 'current_state', type: 'logic', width: 3 },
				{ name: 'next_state', type: 'logic', width: 3 },
				{ name: 'output_temp', type: 'logic', width: 1 },
			],
			blocks: [
				{
					id: 'block_0',
					type: 'always_comb',
					inputs: ['current_state', 'input_signal'],
					outputs: ['next_state', 'output_temp'],
				},
				{
					id: 'block_1',
					type: 'always_ff',
					inputs: ['next_state'],
					outputs: ['current_state'],
					clk: 'clk',
				},
			],
			instances: [],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.STATE_MACHINE, 'Should detect state machine with current_state naming');
	});

	/**
	 * Test 10: Multiple always_ff blocks without state machine pattern
	 */
	mocha.test('distinguishes shift register (SEQUENTIAL) from state machine', () => {
		const module: ModuleJSON = {
			name: 'shift_register',
			ports: [
				{ name: 'clk', direction: 'input', width: 1 },
				{ name: 'reset', direction: 'input', width: 1 },
				{ name: 'data_in', direction: 'input', width: 1 },
				{ name: 'data_out', direction: 'output', width: 1 },
			],
			signals: [
				{ name: 'stage1', type: 'logic', width: 1 },
				{ name: 'stage2', type: 'logic', width: 1 },
				{ name: 'stage3', type: 'logic', width: 1 },
			],
			blocks: [
				{
					id: 'block_0',
					type: 'always_ff',
					inputs: ['data_in'],
					outputs: ['stage1'],
					clk: 'clk',
				},
				{
					id: 'block_1',
					type: 'always_ff',
					inputs: ['stage1'],
					outputs: ['stage2'],
					clk: 'clk',
				},
				{
					id: 'block_2',
					type: 'always_ff',
					inputs: ['stage2'],
					outputs: ['stage3'],
					clk: 'clk',
				},
				{
					id: 'block_3',
					type: 'assign',
					inputs: ['stage3'],
					outputs: ['data_out'],
				},
			],
			instances: [],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.SEQUENTIAL, 'Should detect as SEQUENTIAL, not STATE_MACHINE');
	});

	/**
	 * Test 11: Mixed with only instances and assign (still MIXED)
	 */
	mocha.test('detects MIXED when instances have assign blocks', () => {
		const module: ModuleJSON = {
			name: 'mixed_assign',
			ports: [
				{ name: 'a', direction: 'input', width: 8 },
				{ name: 'b', direction: 'output', width: 8 },
			],
			signals: [{ name: 'intermediate', type: 'logic', width: 8 }],
			blocks: [
				{
					id: 'block_0',
					type: 'assign',
					inputs: ['a'],
					outputs: ['intermediate'],
				},
			],
			instances: [
				{
					name: 'inst_0',
					module: 'some_module',
					connections: { in: 'intermediate', out: 'b' },
				},
			],
		};

		const result = detectBlockType(module);
		assert.strictEqual(result, BlockType.MIXED, 'Should detect MIXED with instances and blocks');
	});
});
