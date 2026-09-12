import * as vscode from 'vscode';
import { ParserBridge } from './parser-bridge';
import { ParserOutput, ParserError } from './types/ast';
import { LayoutEngine } from './webview/layout-engine';
import { Layout } from './webview/types/layout';

/**
 * Orchestrates the complete diagram update pipeline:
 * file → parse → layout → data
 *
 * Responsible for:
 * - Reading files via ParserBridge
 * - Computing layout via LayoutEngine
 * - Coordinating error handling at each stage
 * - Reporting progress and status
 * - Publishing errors to VSCode Problems panel
 */
export class DiagramManager {
	private parserBridge: ParserBridge;
	private layoutEngine: LayoutEngine;
	private statusBar: vscode.StatusBarItem;
	private diagnosticCollection: vscode.DiagnosticCollection;

	/**
	 * Creates a new DiagramManager instance
	 */
	constructor() {
		this.parserBridge = new ParserBridge();
		this.layoutEngine = new LayoutEngine();
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection('schematex');

		// Create status bar item for progress updates
		this.statusBar = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			100
		);
		this.statusBar.command = undefined; // Read-only display
	}

	/**
	 * Updates the diagram for a given file.
	 * Orchestrates the full pipeline: parse → layout → prepare for rendering
	 *
	 * @param filePath Path to the .sv file to process
	 * @returns DiagramUpdateResult containing AST, layout, and metadata
	 * @throws Error if any stage of the pipeline fails
	 */
	async updateDiagram(filePath: string): Promise<DiagramUpdateResult> {
		const startTime = Date.now();

		try {
			// Stage 1: Parse the file
			console.log(`[DiagramManager] Starting diagram update for ${filePath}`);
			this.updateStatus('Parsing...', 'parsing');

			let ast: ParserOutput;
			try {
				ast = await this.parserBridge.parseFile(filePath);
				console.log(`[DiagramManager] Parse successful`);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				console.error(`[DiagramManager] Parse failed: ${errorMsg}`);
				this.updateStatus(`Parse error: ${errorMsg}`, 'error');
				throw new Error(`Failed to parse file: ${errorMsg}`);
			}

			// Stage 2: Compute layout
			console.log(`[DiagramManager] Computing layout...`);
			this.updateStatus('Computing layout...', 'rendering');

			let layout: Layout;
			try {
				layout = await this.layoutEngine.computeLayout(ast);
				console.log(`[DiagramManager] Layout computed successfully`);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				console.error(`[DiagramManager] Layout computation failed: ${errorMsg}`);
				this.updateStatus(`Layout error: ${errorMsg}`, 'error');
				throw new Error(`Failed to compute layout: ${errorMsg}`);
			}

			// Publish errors to Problems panel
			this.publishDiagnostics(filePath, ast.errors || []);

			// Prepare result
			const elapsed = Date.now() - startTime;
			const result: DiagramUpdateResult = {
				ast,
				layout,
				filePath,
				elapsedMs: elapsed,
				status: 'success',
			};

			console.log(
				`[DiagramManager] Diagram update complete (${elapsed}ms): ` +
				`${ast.module?.ports?.length || 0} ports, ` +
				`${ast.module?.signals?.length || 0} signals, ` +
				`${ast.module?.instances?.length || 0} instances, ` +
				`${ast.errors?.length || 0} errors`
			);

			this.updateStatus('Ready', 'success');
			return result;
		} catch (error) {
			const elapsed = Date.now() - startTime;
			const errorMsg = error instanceof Error ? error.message : String(error);

			// Return error result
			const result: DiagramUpdateResult = {
				filePath,
				elapsedMs: elapsed,
				status: 'error',
				error: errorMsg,
			};

			this.updateStatus(`Error: ${errorMsg}`, 'error');
			return result;
		}
	}

	/**
	 * Updates the status bar with the current state
	 * @param message Status message to display
	 * @param state 'parsing' | 'rendering' | 'success' | 'error'
	 */
	private updateStatus(message: string, state: 'parsing' | 'rendering' | 'success' | 'error'): void {
		const icon = this.getIconForState(state);
		this.statusBar.text = `${icon} SchemaTeX: ${message}`;

		// Auto-hide success after 2 seconds
		if (state === 'success') {
			setTimeout(() => {
				if (this.statusBar.text?.includes('Ready')) {
					this.statusBar.hide();
				}
			}, 2000);
		} else {
			this.statusBar.show();
		}
	}

	/**
	 * Gets the appropriate icon for a given state
	 * @param state Status state
	 * @returns Icon name for VS Code (in Codicon format)
	 */
	private getIconForState(state: 'parsing' | 'rendering' | 'success' | 'error'): string {
		switch (state) {
			case 'parsing':
				return '$(loading~spin)';
			case 'rendering':
				return '$(loading~spin)';
			case 'success':
				return '$(check)';
			case 'error':
				return '$(error)';
		}
	}

	/**
	 * Publishes parser errors to the VSCode Problems panel
	 * @param filePath Path to the file being parsed
	 * @param errors Array of parser errors
	 */
	private publishDiagnostics(filePath: string, errors: ParserError[]): void {
		const fileUri = vscode.Uri.file(filePath);
		const diagnostics: vscode.Diagnostic[] = [];

		for (const error of errors) {
			// Convert 1-based line/column to 0-based VSCode format
			const line = Math.max(0, error.line - 1);
			const column = Math.max(0, error.column - 1);
			const range = new vscode.Range(line, column, line, column + 10);

			const severity = error.type === 'warning'
				? vscode.DiagnosticSeverity.Warning
				: vscode.DiagnosticSeverity.Error;

			const diagnostic = new vscode.Diagnostic(
				range,
				error.message,
				severity
			);

			// Set diagnostic source and code
			diagnostic.source = 'SchemaTeX Parser';
			if (error.code) {
				diagnostic.code = error.code;
			}

			diagnostics.push(diagnostic);
		}

		// Set diagnostics for the file
		this.diagnosticCollection.set(fileUri, diagnostics);

		console.log(`[DiagramManager] Published ${diagnostics.length} diagnostics for ${filePath}`);
	}

	/**
	 * Disposes the diagram manager and cleans up resources
	 */
	dispose(): void {
		this.statusBar.dispose();
		this.diagnosticCollection.dispose();
		this.parserBridge.terminate();
	}
}

/**
 * Result of a diagram update operation
 */
export interface DiagramUpdateResult {
	/** The parsed SystemVerilog AST */
	ast?: ParserOutput;
	/** The computed layout with positioned nodes and edges */
	layout?: Layout;
	/** Path to the file that was processed */
	filePath: string;
	/** Time elapsed for the operation in milliseconds */
	elapsedMs: number;
	/** Status of the operation */
	status: 'success' | 'error';
	/** Error message if status is 'error' */
	error?: string;
}
