import * as vscode from 'vscode';
import { WebviewProvider } from './webview-provider';
import { ClaudeIntegration } from './claude-integration';
import { ParserBridge } from './parser-bridge';
import { FileWatcher } from './file-watcher';
import { DiagramManager } from './diagram-manager';
import { ParserOutput } from './types/ast';
import { ClaudeClient } from './claude-client';
import { debounce, DebouncedFunction } from './debounce';

let webviewProvider: WebviewProvider;
let claudeIntegration: ClaudeIntegration;
let parserBridge: ParserBridge;
let fileWatcher: FileWatcher;
let diagramManager: DiagramManager;
let currentFileWatcherDisposable: vscode.Disposable | null = null;
let debouncedUpdateDiagram: DebouncedFunction<(changedFilePath: string) => Promise<void>> | null = null;

/**
 * Sets up file watching for the given file path.
 * When the file is saved, the diagram update pipeline is automatically triggered.
 * Updates are debounced with a 500ms delay to handle rapid successive saves.
 */
function setupFileWatcher(filePath: string): void {
	// Dispose previous watcher if it exists
	if (currentFileWatcherDisposable) {
		currentFileWatcherDisposable.dispose();
	}

	// Cancel any pending debounced updates from the previous file
	if (debouncedUpdateDiagram) {
		debouncedUpdateDiagram.cancel();
	}

	console.log(`[SchemaTeX] Setting up file watcher for: ${filePath}`);

	// Create a debounced diagram update function (500ms delay)
	// This ensures that rapid successive saves are coalesced into a single update
	debouncedUpdateDiagram = debounce(async (changedFilePath: string) => {
		try {
			console.log(`[SchemaTeX] Debounced update triggered for: ${changedFilePath}`);

			// Only update if webview is visible
			if (!webviewProvider.isVisible()) {
				console.log(`[SchemaTeX] Webview not visible, skipping update`);
				return;
			}

			// Send status update
			webviewProvider.sendStatus('Parsing...', 'parsing');

			// Run the full diagram update pipeline
			const result = await diagramManager.updateDiagram(changedFilePath);

			if (result.status === 'success' && result.ast && result.layout) {
				console.log(
					`[SchemaTeX] Diagram updated successfully (${result.elapsedMs}ms)`
				);
				// Send both AST and layout to webview
				webviewProvider.sendDiagramDataWithLayout(result.ast, result.layout);
				webviewProvider.sendStatus('Ready', 'success');
			} else {
				const errorMsg = result.error || 'Unknown error';
				console.error(`[SchemaTeX] Diagram update failed: ${errorMsg}`);
				webviewProvider.sendError(`Diagram update failed: ${errorMsg}`);
				webviewProvider.sendStatus(`Error: ${errorMsg}`, 'error');
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error(`[SchemaTeX] Error handling file change: ${errorMsg}`);
			webviewProvider.sendError(`Error: ${errorMsg}`);
		}
	}, 500); // 500ms debounce delay

	// Watch the file and trigger debounced diagram update on changes
	currentFileWatcherDisposable = fileWatcher.watchFile(filePath, (changedFilePath) => {
		console.log(`[SchemaTeX] File changed detected: ${changedFilePath}`);
		// Call the debounced update (timer will be reset on each call)
		debouncedUpdateDiagram!(changedFilePath);
	});
}

/**
 * Activates the SchemaTeX extension.
 * Registers commands and initializes extension components.
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('SchemaTeX extension is now active');

	// Initialize Claude integration (handles API key storage)
	claudeIntegration = new ClaudeIntegration(context);

	// Initialize parser bridge
	parserBridge = new ParserBridge();

	// Initialize file watcher
	fileWatcher = new FileWatcher();

	// Initialize diagram manager (orchestrates full pipeline)
	diagramManager = new DiagramManager();

	// Initialize webview provider
	webviewProvider = new WebviewProvider(context);

	// Set up automatic parser re-run on file save
	if (vscode.window.activeTextEditor) {
		const filePath = vscode.window.activeTextEditor.document.uri.fsPath;
		if (filePath.endsWith('.sv') && !vscode.window.activeTextEditor.document.isUntitled) {
			setupFileWatcher(filePath);
		}
	}

	// Handle active editor changes
	const editorChangeSubscription = vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor && editor.document.uri.fsPath.endsWith('.sv') && !editor.document.isUntitled) {
			setupFileWatcher(editor.document.uri.fsPath);
		}
	});

	context.subscriptions.push(editorChangeSubscription);

	// Register the "Show Diagram" command
	let showDiagramCommand = vscode.commands.registerCommand(
		'schematex.showDiagram',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}

			// Show the webview panel
			await webviewProvider.showPanel(editor.document.uri);

			// Set up file watcher for the current file
			if (editor.document.uri.fsPath.endsWith('.sv') && !editor.document.isUntitled) {
				setupFileWatcher(editor.document.uri.fsPath);
			}

			// Show progress while running the full pipeline
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Generating diagram...',
					cancellable: false,
				},
				async () => {
					// Notify webview that we're loading
					webviewProvider.sendLoading();

					try {
						// Run the full diagram update pipeline
						const result = await diagramManager.updateDiagram(editor.document.uri.fsPath);

						if (result.status === 'success' && result.ast && result.layout) {
							console.log(`[SchemaTeX] Diagram generated successfully (${result.elapsedMs}ms)`);
							// Send both AST and layout to webview
							webviewProvider.sendDiagramDataWithLayout(result.ast, result.layout);
						} else {
							const errorMsg = result.error || 'Unknown error';
							console.error(`[SchemaTeX] Diagram generation failed: ${errorMsg}`);
							webviewProvider.sendError(`Error: ${errorMsg}`);
						}
					} catch (error) {
						const errorMsg = error instanceof Error ? error.message : String(error);
						console.error(`[SchemaTeX] Error generating diagram: ${errorMsg}`);
						webviewProvider.sendError(`Error: ${errorMsg}`);
					}
				}
			);
		}
	);

	// Register the "Simplify with AI" command
	let simplifyCommand = vscode.commands.registerCommand(
		'schematex.simplify',
		async () => {
			try {
				const apiKey = await claudeIntegration.getApiKey();
				if (!apiKey) {
					vscode.window.showErrorMessage('Claude API key not configured');
					return;
				}

				const editor = vscode.window.activeTextEditor;
				if (!editor) {
					vscode.window.showErrorMessage('No active editor');
					return;
				}

				// Show progress while parsing and inferring abstraction
				await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: 'Inferring abstraction...',
						cancellable: false,
					},
					async () => {
						try {
							// Parse the current file
							const ast = await parserBridge.parseFile(editor.document.uri.fsPath);

							// Call Claude to infer abstraction
							const claudeClient = new ClaudeClient(apiKey);
							const abstraction = await claudeClient.inferAbstraction(ast);

							// Show result to user
							vscode.window.showInformationMessage(
								`Abstraction inferred: ${abstraction.name} (confidence: ${(abstraction.confidence * 100).toFixed(0)}%)`
							);

							// TODO: Visualize abstraction in webview (#18)
							// For now, just log it
							console.log('Inferred abstraction:', abstraction);
						} catch (innerError) {
							const errorMsg = innerError instanceof Error ? innerError.message : String(innerError);
							vscode.window.showErrorMessage(`Parsing/abstraction error: ${errorMsg}`);
						}
					}
				);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(`Simplification failed: ${errorMsg}`);
			}
		}
	);

	// Register the "Export Diagram" command
	let exportCommand = vscode.commands.registerCommand(
		'schematex.exportDiagram',
		async () => {
			// TODO: Implement export functionality
			vscode.window.showInformationMessage('Export functionality coming soon');
		}
	);

	// Register the "Set Claude API Key" command
	let setApiKeyCommand = vscode.commands.registerCommand(
		'schematex.setApiKey',
		async () => {
			const apiKey = await vscode.window.showInputBox({
				prompt: 'Enter your Claude API key',
				password: true,
				ignoreFocusOut: true,
				placeHolder: 'sk-ant-...',
			});

			if (apiKey) {
				try {
					await claudeIntegration.setApiKey(apiKey);
					vscode.window.showInformationMessage('Claude API key saved securely');
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : String(error);
					vscode.window.showErrorMessage(`Failed to save API key: ${errorMsg}`);
				}
			}
		}
	);

	// Register subscriptions
	const subscriptions = [
		showDiagramCommand,
		simplifyCommand,
		exportCommand,
		setApiKeyCommand,
		editorChangeSubscription,
	];

	// Add current file watcher disposable if it exists
	if (currentFileWatcherDisposable) {
		subscriptions.push(currentFileWatcherDisposable);
	}

	context.subscriptions.push(...subscriptions);
}

/**
 * Deactivates the SchemaTeX extension.
 */
export function deactivate() {
	console.log('SchemaTeX extension is now deactivated');

	// Cancel any pending debounced updates
	if (debouncedUpdateDiagram) {
		debouncedUpdateDiagram.cancel();
		debouncedUpdateDiagram = null;
	}

	// Dispose diagram manager
	if (diagramManager) {
		diagramManager.dispose();
	}

	// Dispose file watcher and clean up resources
	if (fileWatcher) {
		fileWatcher.dispose();
	}

	if (currentFileWatcherDisposable) {
		currentFileWatcherDisposable.dispose();
		currentFileWatcherDisposable = null;
	}

	// Terminate parser if running
	if (parserBridge) {
		parserBridge.terminate();
	}
}
