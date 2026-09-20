import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ParserOutput, Module } from './types/ast';

/**
 * Manages communication with the SystemVerilog parser subprocess.
 * Spawns parser CLI and handles JSON AST output.
 */
export class ParserBridge {
	private parserProcess: ChildProcess | null = null;
	private readonly PARSER_TIMEOUT = 5000;  // 5 seconds

	/**
	 * Gets the parser binary path and command for the current platform.
	 * @returns Object with command and args to execute the parser
	 * @throws Error if binary not found
	 */
	private getParserCommand(): { command: string; scriptPath: string } {
		const binDir = process.platform === 'win32'
			? 'win32'
			: process.platform === 'darwin'
			? 'darwin'
			: 'linux';

		// Get the extension directory (where extension.ts is located)
		const extensionDir = vscode.extensions.getExtension('schematex.schematex')?.extensionPath ||
			path.join(__dirname, '..');

		const binPath = path.join(extensionDir, 'bin', binDir);

		// Try to find the binary in order of preference
		const binaryName = process.platform === 'win32' ? 'schematex-parser.exe' : 'schematex-parser';
		const exePath = path.join(binPath, binaryName);

		if (fs.existsSync(exePath)) {
			return { command: exePath, scriptPath: exePath };
		}

		// Fall back to Node.js wrapper script
		const jsPath = path.join(binPath, 'schematex-parser.js');
		if (fs.existsSync(jsPath)) {
			return { command: 'node', scriptPath: jsPath };
		}

		throw new Error(
			`Parser binary not found. ` +
			`Looked for: ${exePath} or ${jsPath}. ` +
			`Please ensure the parser is built and bundled in extension/bin/{platform}/`
		);
	}

	/**
	 * Parses a Verilog file and returns the AST.
	 * @param filePath Path to the .sv file to parse
	 * @returns Promise resolving to ParserOutput containing the AST
	 */
	async parseFile(filePath: string): Promise<ParserOutput> {
		// Verify the input file exists
		if (!fs.existsSync(filePath)) {
			throw new Error(`Input file not found: ${filePath}`);
		}

		try {
			const { command, scriptPath } = this.getParserCommand();
			console.log(`[SchemaTeX] Spawning parser: ${command} ${scriptPath} ${filePath}`);

			const output = await this.spawnParser(command, scriptPath, filePath);
			return output;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error(`[SchemaTeX] Parser error: ${errorMsg}`);
			throw error;
		}
	}

	/**
	 * Spawns the parser subprocess and captures its output.
	 * @param command Command to execute (e.g., 'node', or path to binary)
	 * @param scriptPath Path to the parser script/binary
	 * @param filePath Path to the file to parse
	 * @returns Promise resolving to ParserOutput
	 */
	private spawnParser(command: string, scriptPath: string, filePath: string): Promise<ParserOutput> {
		return new Promise((resolve, reject) => {
			let stdout = '';
			let stderr = '';
			let timedOut = false;

			const startTime = Date.now();

			// Build arguments based on whether we're using a wrapper or direct binary
			const isNodeWrapper = command === 'node';
			const args = isNodeWrapper
				? [scriptPath, filePath]
				: [filePath];

			// Spawn the parser process
			const process = spawn(command, args, {
				stdio: ['pipe', 'pipe', 'pipe'],
				timeout: this.PARSER_TIMEOUT,
			});

			// Set a timeout to kill the process if it takes too long
			const timeoutHandle = setTimeout(() => {
				timedOut = true;
				process.kill();
				reject(new Error(
					`Parser timeout after ${this.PARSER_TIMEOUT}ms. ` +
					`File may be too large or contain complex constructs.`
				));
			}, this.PARSER_TIMEOUT);

			// Capture stdout (JSON output)
			process.stdout?.on('data', (data) => {
				stdout += data.toString('utf-8');
			});

			// Capture stderr (error messages)
			process.stderr?.on('data', (data) => {
				stderr += data.toString('utf-8');
			});

			// Handle process exit
			process.on('exit', (code) => {
				clearTimeout(timeoutHandle);

				if (timedOut) {
					return;  // Already rejected
				}

				const elapsed = Date.now() - startTime;

				if (code === 0) {
					try {
						// Parse the JSON output
						const output: ParserOutput = JSON.parse(stdout);
						output.metadata = output.metadata || {};
						output.metadata.parseTime = elapsed;
						console.log(`[SchemaTeX] Parse successful in ${elapsed}ms`);
						resolve(output);
					} catch (parseError) {
						reject(new Error(
							`Failed to parse parser output as JSON: ` +
							`${parseError instanceof Error ? parseError.message : String(parseError)}`
						));
					}
				} else {
					// Parser exited with error
					const errorMsg = stderr.trim() || `Parser exited with code ${code}`;
					reject(new Error(`Parser error:\n${errorMsg}`));
				}
			});

			// Handle process errors
			process.on('error', (err) => {
				clearTimeout(timeoutHandle);
				reject(new Error(`Failed to spawn parser: ${err.message}`));
			});

			this.parserProcess = process;
		});
	}

	/**
	 * Terminates the parser subprocess if running.
	 */
	terminate(): void {
		if (this.parserProcess) {
			this.parserProcess.kill();
			this.parserProcess = null;
		}
	}
}
