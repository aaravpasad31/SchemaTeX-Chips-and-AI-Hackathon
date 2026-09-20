/**
 * BlockTypeDetector - Classifies modules into 6 types based on AST structure
 * Deterministic detection based on presence of instances, blocks, and block types
 */

import { ModuleJSON, BlockJSON, SignalJSON } from '../types/ast';

/**
 * Enumeration of the 6 possible block types
 */
export enum BlockType {
	/** Module contains instances but no logic blocks (hierarchical decomposition) */
	HIERARCHICAL = 'HIERARCHICAL',
	/** Module contains only combinational logic (always_comb or assign) */
	COMBINATIONAL = 'COMBINATIONAL',
	/** Module contains sequential logic (always_ff blocks) */
	SEQUENTIAL = 'SEQUENTIAL',
	/** Module is a state machine (always_ff + enum state register + case statement) */
	STATE_MACHINE = 'STATE_MACHINE',
	/** Module uses arrays for memory with read/write patterns */
	MEMORY = 'MEMORY',
	/** Module contains both instances and logic blocks */
	MIXED = 'MIXED',
}

/**
 * Detects the block type of a module based on its AST structure
 * Uses deterministic rules assuming best practices
 *
 * @param module - Parsed ModuleJSON from the SystemVerilog parser
 * @returns BlockType - One of the 6 block types
 */
export function detectBlockType(module: ModuleJSON): BlockType {
	// Extract counts and information from module
	const hasInstances = module.instances && module.instances.length > 0;
	const blocks = module.blocks || [];
	const signals = module.signals || [];

	const hasBlocks = blocks.length > 0;
	const hasOnlyAlwaysComb = blocks.length > 0 && blocks.every((b) => b.type === 'always_comb' || b.type === 'assign');
	const hasAlwaysFf = blocks.some((b) => b.type === 'always_ff');
	const hasAlwaysComb = blocks.some((b) => b.type === 'always_comb' || b.type === 'assign');

	// Rule 1: HIERARCHICAL - instances exist, no blocks
	if (hasInstances && !hasBlocks) {
		return BlockType.HIERARCHICAL;
	}

	// Rule 6 (early check): MIXED - instances > 0 && blocks > 0
	// Check this before type-specific rules so modules with both hierarchy and logic are classified correctly
	if (hasInstances && hasBlocks) {
		return BlockType.MIXED;
	}

	// Rule 2: COMBINATIONAL - only combinational blocks (always_comb or assign)
	// Only applies if no instances (otherwise would be MIXED)
	if (hasOnlyAlwaysComb) {
		return BlockType.COMBINATIONAL;
	}

	// Rule 3: STATE_MACHINE - has always_ff + enum state register + case on state
	if (hasAlwaysFf && isStateMachine(blocks, signals, module)) {
		return BlockType.STATE_MACHINE;
	}

	// Rule 4: MEMORY - array declarations + read/write patterns
	if (hasMemoryPattern(blocks, signals)) {
		return BlockType.MEMORY;
	}

	// Rule 5: SEQUENTIAL - has always_ff blocks (but not state machine)
	if (hasAlwaysFf) {
		return BlockType.SEQUENTIAL;
	}

	// Default to COMBINATIONAL if no other rules match and has some blocks
	if (hasBlocks) {
		return BlockType.COMBINATIONAL;
	}

	// If nothing matches, default to COMBINATIONAL (safest assumption for unknown logic)
	return BlockType.COMBINATIONAL;
}

/**
 * Checks if a module is a state machine
 * Looks for: always_ff + enum or state signal + case statement pattern
 *
 * @param blocks - Array of blocks in the module
 * @param signals - Array of signals in the module
 * @param module - The full module (for context)
 * @returns true if this appears to be a state machine
 */
function isStateMachine(blocks: BlockJSON[], signals: SignalJSON[], module: ModuleJSON): boolean {
	// Must have at least one always_ff block
	const hasAlwaysFf = blocks.some((b) => b.type === 'always_ff');
	if (!hasAlwaysFf) {
		return false;
	}

	// Look for enum state register or state-like signal patterns
	// Common naming conventions: state, current_state, next_state, state_reg
	const stateSignals = signals.filter(
		(s) =>
			s.name &&
			(s.name.toLowerCase().includes('state') ||
				s.name.toLowerCase().includes('state_reg') ||
				s.name.toLowerCase().includes('current_state') ||
				s.name.toLowerCase().includes('next_state'))
	);

	// Must have at least one state-like signal
	if (stateSignals.length === 0) {
		return false;
	}

	// Check for patterns indicating case statements in blocks
	// For now, we detect if always_ff blocks have state signals in inputs/outputs
	const stateSignalNames = stateSignals.map((s) => s.name);
	const blockUsesState = blocks.some(
		(b) =>
			b.type === 'always_ff' &&
			(b.inputs.some((input) => stateSignalNames.includes(input)) ||
				b.outputs.some((output) => stateSignalNames.includes(output)))
	);

	return blockUsesState;
}

/**
 * Checks if a module has memory-like patterns
 * Looks for: array declarations + read/write patterns
 *
 * @param blocks - Array of blocks in the module
 * @param signals - Array of signals in the module
 * @returns true if this appears to be memory
 */
function hasMemoryPattern(blocks: BlockJSON[], signals: SignalJSON[]): boolean {
	// Look for array signals
	const arraySignals = signals.filter((s) => s.isArray);
	if (arraySignals.length === 0) {
		return false;
	}

	// Check for read/write patterns in blocks
	// Memory modules typically read and write to arrays within blocks
	const arrayNames = arraySignals.map((s) => s.name);

	// Check if any block mentions array signals in inputs or outputs
	const usesArrays = blocks.some(
		(b) =>
			b.inputs.some((input) => arrayNames.some((arr) => input.includes(arr))) ||
			b.outputs.some((output) => arrayNames.some((arr) => output.includes(arr)))
	);

	return usesArrays;
}
