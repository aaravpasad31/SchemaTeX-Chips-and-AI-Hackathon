/**
 * Block type classifications for SystemVerilog modules
 * Based on SPEC.md detection algorithm
 */

export enum BlockType {
	/** Module containing only child module instances, no internal logic */
	HIERARCHICAL_CONTAINER = 'hierarchical_container',

	/** Pure combinational blocks, no state storage (only always_comb) */
	COMBINATIONAL_LOGIC = 'combinational_logic',

	/** Registered logic with state (always_ff blocks) */
	SEQUENTIAL_LOGIC = 'sequential_logic',

	/** Explicit FSM with enum state register and state transitions */
	STATE_MACHINE = 'state_machine',

	/** Array-based storage with read/write logic */
	MEMORY_BLOCK = 'memory_block',

	/** Contains both child instances AND internal logic */
	MIXED_MODULE = 'mixed_module',

	/** Unknown or unclassified module */
	UNKNOWN = 'unknown',
}

/**
 * Visual properties for each block type
 */
export interface BlockTypeProperties {
	type: BlockType;
	label: string;
	color: string;
	shape: 'rectangle' | 'circle' | 'diamond';
	pattern?: 'solid' | 'hatch' | 'dots';
	icon?: string;
}

/**
 * Map of BlockType to visual properties
 */
export const BLOCK_TYPE_PROPERTIES: Record<BlockType, BlockTypeProperties> = {
	[BlockType.HIERARCHICAL_CONTAINER]: {
		type: BlockType.HIERARCHICAL_CONTAINER,
		label: 'Hierarchical Container',
		color: '#e8f4f8',
		shape: 'rectangle',
		pattern: 'solid',
		icon: '□',
	},
	[BlockType.COMBINATIONAL_LOGIC]: {
		type: BlockType.COMBINATIONAL_LOGIC,
		label: 'Combinational Logic',
		color: '#fff4e6',
		shape: 'rectangle',
		pattern: 'solid',
		icon: '⊕',
	},
	[BlockType.SEQUENTIAL_LOGIC]: {
		type: BlockType.SEQUENTIAL_LOGIC,
		label: 'Sequential Logic',
		color: '#f0f8ff',
		shape: 'rectangle',
		pattern: 'solid',
		icon: '⌛',
	},
	[BlockType.STATE_MACHINE]: {
		type: BlockType.STATE_MACHINE,
		label: 'State Machine',
		color: '#ffe6f0',
		shape: 'circle',
		pattern: 'solid',
		icon: '◯',
	},
	[BlockType.MEMORY_BLOCK]: {
		type: BlockType.MEMORY_BLOCK,
		label: 'Memory Block',
		color: '#f5e6ff',
		shape: 'rectangle',
		pattern: 'hatch',
		icon: '▥',
	},
	[BlockType.MIXED_MODULE]: {
		type: BlockType.MIXED_MODULE,
		label: 'Mixed Module',
		color: '#fff0f5',
		shape: 'rectangle',
		pattern: 'solid',
		icon: '⊞',
	},
	[BlockType.UNKNOWN]: {
		type: BlockType.UNKNOWN,
		label: 'Unknown',
		color: '#f5f5f5',
		shape: 'rectangle',
		pattern: 'dots',
		icon: '?',
	},
};
