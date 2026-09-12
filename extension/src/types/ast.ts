/**
 * TypeScript interfaces for the SystemVerilog AST
 * Matches the C++ AST structure from parser/include/ast.h
 */

/**
 * Base interface for all AST nodes
 */
export interface ASTNode {
	type: string;
	[key: string]: any;
}

/**
 * Port definition (input, output, inout)
 */
export interface Port extends ASTNode {
	type: 'port';
	name: string;
	direction: 'INPUT' | 'OUTPUT' | 'INOUT';
	width: number;  // Bit width (1 for single bit, 8 for [7:0], etc.)
}

/**
 * Signal declaration (wire, reg, logic)
 */
export interface Signal extends ASTNode {
	type: 'signal';
	name: string;
	signalType: 'WIRE' | 'REG' | 'INTEGER' | 'LOGIC';
	width: number;
}

/**
 * Instance of a module
 */
export interface Instance extends ASTNode {
	type: 'instance';
	moduleName: string;
	instanceName: string;
	portConnections: Array<{
		port: string;
		signal: string;
	}>;
}

/**
 * Assignment statement
 */
export interface Assignment extends ASTNode {
	type: 'assignment';
	target: string;
	source: string;
	isBlocking: boolean;  // true for =, false for <=
}

/**
 * Block (begin...end or always block)
 */
export interface Block extends ASTNode {
	type: 'block';
	blockType: 'SEQUENTIAL' | 'COMBINATIONAL';
	statements: ASTNode[];
}

/**
 * Module definition - the root AST node
 */
export interface Module extends ASTNode {
	type: 'module';
	name: string;
	ports: Port[];
	signals: Signal[];
	instances: Instance[];
	statements: ASTNode[];  // assignments, blocks, etc.
}

/**
 * Parser error information
 */
export interface ParserError {
	/** Error message */
	message: string;
	/** Line number (1-based) */
	line: number;
	/** Column number (1-based) */
	column: number;
	/** Error type: 'parse-error', 'unsupported', 'warning', etc. */
	type: 'parse-error' | 'unsupported' | 'warning';
	/** Optional source code snippet */
	source?: string;
	/** Optional error code for categorization */
	code?: string;
}

/**
 * Complete parser output structure
 */
export interface ParserOutput {
	module?: Module;
	metadata?: {
		fileName?: string;
		parseTime?: number;
		errorCount?: number;
	};
	/** Array of parser errors and warnings */
	errors?: ParserError[];
}
