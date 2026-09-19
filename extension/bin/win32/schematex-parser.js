#!/usr/bin/env node

/**
 * Placeholder SystemVerilog parser CLI for testing
 * In production, this would be the actual C++ parser compiled to .exe
 */

const fs = require('fs');
const path = require('path');

function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.error('Usage: schematex-parser <input.sv>');
		process.exit(1);
	}

	const filePath = args[0];

	// Check if file exists
	if (!fs.existsSync(filePath)) {
		console.error(`Error: Cannot open file '${filePath}'`);
		process.exit(1);
	}

	// Read file content for validation
	try {
		const content = fs.readFileSync(filePath, 'utf-8');

		// Check if it looks like a SystemVerilog file
		if (content.length === 0) {
			console.error('Error: Input file is empty');
			process.exit(1);
		}

		// Generate a sample AST based on the file name
		const fileName = path.basename(filePath);
		const moduleName = fileName.replace(/\.[^/.]+$/, '');  // Remove extension

		const output = {
			module: {
				type: 'module',
				name: moduleName || 'TestModule',
				ports: [
					{
						type: 'port',
						name: 'clk',
						direction: 'INPUT',
						width: 1
					},
					{
						type: 'port',
						name: 'rst',
						direction: 'INPUT',
						width: 1
					},
					{
						type: 'port',
						name: 'data_out',
						direction: 'OUTPUT',
						width: 8
					}
				],
				signals: [
					{
						type: 'signal',
						name: 'counter',
						signalType: 'REG',
						width: 8
					}
				],
				instances: [],
				statements: []
			},
			metadata: {
				fileName: filePath,
				parseTime: 0
			}
		};

		// Output JSON to stdout
		console.log(JSON.stringify(output, null, 2));
		process.exit(0);
	} catch (error) {
		console.error(`Error: Failed to read file: ${error.message}`);
		process.exit(1);
	}
}

main();
