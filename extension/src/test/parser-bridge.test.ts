import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { ParserBridge } from '../parser-bridge';
import { ParserOutput, Module } from '../types/ast';

suite('ParserBridge', () => {
	let parserBridge: ParserBridge;
	let testFilePath: string;

	setup(() => {
		parserBridge = new ParserBridge();

		// Create a temporary test file
		const tempDir = path.join(__dirname, '..', '..', 'test-files');
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}

		testFilePath = path.join(tempDir, 'test.sv');
		fs.writeFileSync(testFilePath, `
module test_module (
	input clk,
	input rst,
	output [7:0] data_out
);
	reg [7:0] counter;

	always @(posedge clk or posedge rst) begin
		if (rst) begin
			counter <= 8'b0;
		end else begin
			counter <= counter + 1;
		end
	end

	assign data_out = counter;
endmodule
		`);
	});

	teardown(() => {
		// Clean up
		if (fs.existsSync(testFilePath)) {
			fs.unlinkSync(testFilePath);
		}
		parserBridge.terminate();
	});

	test('parseFile should parse a valid SystemVerilog file', async () => {
		const output = await parserBridge.parseFile(testFilePath);

		assert.ok(output, 'Output should not be null');
		assert.ok(output.module, 'Output should have a module');
		assert.strictEqual(output.module.type, 'module');
		assert.ok(output.module.name, 'Module should have a name');
	});

	test('parseFile should return valid AST structure', async () => {
		const output = await parserBridge.parseFile(testFilePath);

		const module = output.module as Module;

		// Check module structure
		assert.ok(Array.isArray(module.ports), 'Module should have ports array');
		assert.ok(Array.isArray(module.signals), 'Module should have signals array');
		assert.ok(Array.isArray(module.instances), 'Module should have instances array');
		assert.ok(Array.isArray(module.statements), 'Module should have statements array');
	});

	test('parseFile should populate metadata', async () => {
		const output = await parserBridge.parseFile(testFilePath);

		assert.ok(output.metadata, 'Output should have metadata');
		assert.ok(output.metadata.fileName, 'Metadata should have fileName');
		assert.ok(typeof output.metadata.parseTime === 'number', 'Metadata should have parseTime');
	});

	test('parseFile should throw for non-existent file', async () => {
		const nonExistentPath = path.join(__dirname, 'nonexistent.sv');

		try {
			await parserBridge.parseFile(nonExistentPath);
			assert.fail('Should have thrown an error');
		} catch (error) {
			assert.ok(error instanceof Error);
			assert.strictEqual(error.message, `Input file not found: ${nonExistentPath}`);
		}
	});

	test('parseFile should handle empty files gracefully', async () => {
		const emptyFilePath = path.join(__dirname, '..', '..', 'test-files', 'empty.sv');
		fs.writeFileSync(emptyFilePath, '');

		try {
			await parserBridge.parseFile(emptyFilePath);
			// Empty file should be handled by the parser mock
		} catch (error) {
			// This is acceptable - the parser may reject empty files
			assert.ok(error instanceof Error);
		} finally {
			if (fs.existsSync(emptyFilePath)) {
				fs.unlinkSync(emptyFilePath);
			}
		}
	});

	test('terminate should kill the parser process', async () => {
		// Start parsing
		const parsePromise = parserBridge.parseFile(testFilePath);

		// Terminate immediately
		parserBridge.terminate();

		// The process should be killed
		// We can't easily verify the process was killed, but we can ensure terminate() doesn't throw
		assert.ok(true, 'terminate() should not throw');

		try {
			await parsePromise;
		} catch (error) {
			// Error is expected since we killed the process
			assert.ok(error instanceof Error);
		}
	});

	test('parseFile should return ports from parsed file', async () => {
		const output = await parserBridge.parseFile(testFilePath);

		const module = output.module as Module;
		const ports = module.ports;

		assert.ok(Array.isArray(ports), 'Module should have ports');
		assert.ok(ports.length > 0, 'Module should have at least one port');

		// Check port structure
		const port = ports[0];
		assert.ok(port.type === 'port');
		assert.ok(port.name, 'Port should have a name');
		assert.ok(['INPUT', 'OUTPUT', 'INOUT'].includes(port.direction));
		assert.ok(typeof port.width === 'number');
	});

	test('parseFile should return signals from parsed file', async () => {
		const output = await parserBridge.parseFile(testFilePath);

		const module = output.module as Module;
		const signals = module.signals;

		assert.ok(Array.isArray(signals), 'Module should have signals');
		assert.ok(signals.length > 0, 'Module should have at least one signal');

		// Check signal structure
		const signal = signals[0];
		assert.ok(signal.type === 'signal');
		assert.ok(signal.name, 'Signal should have a name');
		assert.ok(['WIRE', 'REG', 'INTEGER', 'LOGIC'].includes(signal.signalType));
		assert.ok(typeof signal.width === 'number');
	});
});
