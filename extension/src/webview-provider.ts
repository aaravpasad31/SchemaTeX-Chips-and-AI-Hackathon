import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { ParserOutput } from './types/ast';

/**
 * Message type definitions for extension <-> webview communication
 */
interface ExtensionMessage {
	type: 'diagram-data' | 'diagram-data-with-layout' | 'error' | 'loading' | 'clear' | 'status';
	payload?: any;
}

interface WebviewMessage {
	type: 'ready' | 'node-selected' | 'node-hovered' | 'zoom-changed' | 'error' | 'load-example';
	payload?: any;
}

/**
 * Manages the webview panel for displaying diagrams.
 * Handles lifecycle, message passing, and content updates.
 */
export class WebviewProvider extends EventEmitter {
	private panel: vscode.WebviewPanel | undefined;
	private context: vscode.ExtensionContext;
	private isReady: boolean = false;

	constructor(context: vscode.ExtensionContext) {
		super();
		this.context = context;
	}

	/**
	 * Shows or creates the diagram webview panel.
	 */
	async showPanel(fileUri: vscode.Uri): Promise<void> {
		// If panel exists, reveal it; otherwise create a new one
		if (this.panel) {
			this.panel.reveal(vscode.ViewColumn.Beside);
		} else {
			this.panel = await this.createPanel();
		}

		// Reset ready state and update content
		this.isReady = false;
		this.updateWebviewContent();
	}

	/**
	 * Creates a new webview panel.
	 */
	private async createPanel(): Promise<vscode.WebviewPanel> {
		const panel = vscode.window.createWebviewPanel(
			'schematexDiagram',
			'SchemaTeX Diagram',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview'),
					vscode.Uri.joinPath(this.context.extensionUri, 'out'),
				],
			}
		);

		// Set up message handler for messages from webview
		panel.webview.onDidReceiveMessage(
			(message: WebviewMessage) => {
				this.handleWebviewMessage(message);
			},
			undefined,
			this.context.subscriptions
		);

		// Handle panel disposal
		panel.onDidDispose(() => {
			this.panel = undefined;
			this.isReady = false;
		});

		return panel;
	}

	/**
	 * Updates the webview content.
	 * This loads the React app bundled at extension/out/webview/index.html
	 */
	private updateWebviewContent(): void {
		if (!this.panel) {
			return;
		}

		// Try to load from bundled index.html first, fall back to inline HTML
		const htmlContent = this.loadWebviewHtml();
		this.panel.webview.html = htmlContent;
	}

	/**
	 * Loads the HTML content for the webview.
	 * Tries to load from bundled index.html, falls back to inline content.
	 */
	private loadWebviewHtml(): string {
		try {
			// Try to load bundled HTML
			const bundledPath = path.join(
				this.context.extensionPath,
				'out',
				'webview',
				'index.html'
			);

			if (fs.existsSync(bundledPath)) {
				let html = fs.readFileSync(bundledPath, 'utf-8');

				// Replace relative paths with webview URIs for bundled resources
				html = this.processHtmlUris(html);

				return html;
			}
		} catch (error) {
			console.error('Failed to load bundled HTML:', error);
		}

		// Fall back to inline HTML with React (will be populated by build process)
		return this.getInlineWebviewContent();
	}

	/**
	 * Processes HTML to replace relative paths with webview URIs
	 */
	private processHtmlUris(html: string): string {
		if (!this.panel) return html;

		// Replace script src paths
		html = html.replace(/src="([^"]+)"/g, (match, src) => {
			if (src.startsWith('http') || src.startsWith('/')) {
				return match;
			}
			const resourceUri = this.panel!.webview.asWebviewUri(
				vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', src)
			);
			return `src="${resourceUri}"`;
		});

		// Replace link href paths
		html = html.replace(/href="([^"]+)"/g, (match, href) => {
			if (href.startsWith('http') || href.startsWith('/')) {
				return match;
			}
			const resourceUri = this.panel!.webview.asWebviewUri(
				vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', href)
			);
			return `href="${resourceUri}"`;
		});

		// Add CSP meta tag
		const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src ${this.panel.webview.cspSource}; img-src ${this.panel.webview.cspSource} data: https:; font-src ${this.panel.webview.cspSource};">`;
		html = html.replace('</head>', `${cspMeta}</head>`);

		return html;
	}

	/**
	 * Returns inline HTML content when bundled version is not available.
	 * This includes the React app and initializes the webview.
	 */
	private getInlineWebviewContent(): string {
		const cspSource = this.panel?.webview.cspSource || "'self'";

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; img-src ${cspSource} data: https:; font-src ${cspSource};">
	<title>SchemaTeX Diagram</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
				'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', sans-serif;
			-webkit-font-smoothing: antialiased;
			-moz-osx-font-smoothing: grayscale;
			background-color: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
			font-size: 13px;
			line-height: 1.6;
			width: 100%;
			height: 100vh;
			overflow: hidden;
		}

		html, body, #root {
			width: 100%;
			height: 100%;
		}

		#root {
			display: flex;
			flex-direction: column;
		}

		.loading {
			display: flex;
			flex-direction: row;
			justify-content: center;
			align-items: center;
			height: 100%;
			font-size: 14px;
			color: var(--vscode-disabledForeground);
			gap: 12px;
		}

		.spinner {
			border: 2px solid var(--vscode-editorGroup-border);
			border-top: 2px solid var(--vscode-editor-foreground);
			border-radius: 50%;
			width: 20px;
			height: 20px;
			animation: spin 1s linear infinite;
			flex-shrink: 0;
		}

		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}

		.error {
			padding: 16px;
			background-color: var(--vscode-inputValidation-errorBackground);
			color: var(--vscode-inputValidation-errorForeground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
			border-radius: 4px;
			margin: 16px;
			font-size: 13px;
		}

		.placeholder {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			height: 100%;
			gap: 16px;
			color: var(--vscode-disabledForeground);
			text-align: center;
			padding: 16px;
		}

		.placeholder p {
			margin: 4px 0;
		}

		.diagram-container {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			padding: 16px;
			gap: 16px;
		}

		.diagram-info {
			padding: 8px 16px;
			background-color: var(--vscode-editorGroupHeader-tabsBackground);
			border-radius: 4px;
			font-size: 12px;
			color: var(--vscode-editorGroupHeader-tabsForeground);
			border: 1px solid var(--vscode-editorGroup-border);
		}

		.diagram-info p {
			margin: 2px 0;
		}

		.diagram-canvas {
			flex: 1;
			border: 1px solid var(--vscode-editorGroup-border);
			border-radius: 4px;
			background-color: var(--vscode-editor-background);
			overflow: auto;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.diagram-placeholder {
			text-align: center;
			color: var(--vscode-disabledForeground);
			padding: 16px;
			max-width: 400px;
		}

		.diagram-placeholder p {
			margin: 8px 0;
			font-size: 13px;
		}

		.node-details {
			padding: 8px 16px;
			background-color: var(--vscode-editorGroupHeader-tabsBackground);
			border-top: 1px solid var(--vscode-editorGroup-border);
			border-radius: 0 0 4px 4px;
			font-size: 12px;
			color: var(--vscode-editorGroupHeader-tabsForeground);
			max-height: 100px;
			overflow-y: auto;
		}

		.node-details p {
			margin: 2px 0;
		}
	</style>
</head>
<body>
	<div id="root">
		<div class="loading">
			<div class="spinner"></div>
			<span>Loading SchemaTeX diagram viewer...</span>
		</div>
	</div>

	<script>
		// Establish communication with extension
		const vscode = acquireVsCodeApi();

		// Make vscode API available globally
		window.vscodeApi = vscode;

		// Signal that webview HTML is loaded
		// The React app will signal 'ready' when it mounts
		vscode.postMessage({ type: 'ready', payload: { timestamp: Date.now() } });
	</script>
</body>
</html>`;
	}

	/**
	 * Handles messages received from the webview
	 */
	private handleWebviewMessage(message: WebviewMessage): void {
		switch (message.type) {
			case 'ready':
				this.isReady = true;
				console.log('Webview is ready to receive messages');
				break;

			case 'node-selected':
				console.log('Node selected:', message.payload?.nodeId);
				// TODO: Handle node selection (for future features like showing code location)
				break;

			case 'node-hovered':
				console.log('Node hovered:', message.payload?.nodeId);
				// TODO: Handle node hover (for future features like preview)
				break;

			case 'zoom-changed':
				console.log('Zoom changed:', message.payload?.scale);
				// TODO: Handle zoom changes (for future features like persistent zoom level)
				break;

			case 'error':
				console.error('Webview error:', message.payload?.error);
				break;

			case 'load-example':
				console.log('Loading example:', message.payload?.filename);
				// Trigger example loading through event emitter
				this.handleLoadExample(message.payload?.filename);
				break;

			default:
				console.warn('Unknown message type from webview:', message.type);
		}
	}

	/**
	 * Sends a message to the webview.
	 */
	postMessage(message: ExtensionMessage): void {
		if (this.panel) {
			this.panel.webview.postMessage(message);
		}
	}

	/**
	 * Sends diagram data to the webview (AST only, layout computed on webview)
	 */
	sendDiagramData(data: ParserOutput): void {
		this.postMessage({
			type: 'diagram-data',
			payload: data,
		});
	}

	/**
	 * Sends diagram data with pre-computed layout to the webview
	 * This is sent by DiagramManager to skip redundant layout computation on webview
	 */
	sendDiagramDataWithLayout(data: ParserOutput, layout: any): void {
		this.postMessage({
			type: 'diagram-data-with-layout',
			payload: { ast: data, layout },
		});
	}

	/**
	 * Sends a status update to the webview
	 */
	sendStatus(status: string, state: 'parsing' | 'rendering' | 'success' | 'error'): void {
		this.postMessage({
			type: 'status',
			payload: { status, state },
		});
	}

	/**
	 * Sends an error message to the webview
	 */
	sendError(error: string): void {
		this.postMessage({
			type: 'error',
			payload: { error },
		});
	}

	/**
	 * Sends a loading message to the webview
	 */
	sendLoading(): void {
		this.postMessage({
			type: 'loading',
		});
	}

	/**
	 * Clears the webview content
	 */
	clear(): void {
		this.postMessage({
			type: 'clear',
		});
	}

	/**
	 * Checks if the webview is ready to receive messages
	 */
	getIsReady(): boolean {
		return this.isReady;
	}

	/**
	 * Checks if the panel exists and is visible
	 */
	getPanelVisible(): boolean {
		return this.panel !== undefined;
	}

	/**
	 * Checks if the webview is visible and ready to receive messages.
	 * Used for determining whether to auto-update on file changes.
	 */
	isVisible(): boolean {
		return this.panel !== undefined;
	}

	/**
	 * Handles a request to load an example file
	 */
	private handleLoadExample(filename: string): void {
		// Emit event for extension to handle
		this.emit('load-example', filename);
	}
}
