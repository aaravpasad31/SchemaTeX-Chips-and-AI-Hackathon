/**
 * Type-safe wrapper around VS Code's webview message passing API.
 * Provides bidirectional communication between extension and webview.
 */

/**
 * Message types sent from extension to webview
 */
export interface ExtensionMessage {
	type: 'diagram-data' | 'error' | 'loading' | 'clear';
	payload?: any;
}

/**
 * Message types sent from webview to extension
 */
export interface WebviewMessage {
	type: 'ready' | 'node-selected' | 'node-hovered' | 'zoom-changed' | 'error' | 'load-example';
	payload?: any;
}

/**
 * Diagram data message payload
 */
export interface DiagramDataPayload {
	nodes: Array<{
		id: string;
		label: string;
		type: string;
	}>;
	edges: Array<{
		source: string;
		target: string;
		label?: string;
	}>;
	metadata?: {
		fileName?: string;
		parseTime?: number;
	};
}

/**
 * VS Code API wrapper for webview communication.
 * Must be called only from within a webview context.
 */
export class VsCodeApi {
	private static instance: VsCodeApi | null = null;
	private vscode: any;
	private messageHandlers: Map<string, Function[]> = new Map();

	private constructor() {
		// Get the VS Code API object (only available in webview context)
		if (typeof window !== 'undefined' && typeof (window as any).acquireVsCodeApi === 'function') {
			this.vscode = (window as any).acquireVsCodeApi();
		} else {
			console.warn('VS Code API not available - running outside webview context');
			this.vscode = null;
		}

		// Listen for messages from extension
		if (typeof window !== 'undefined') {
			window.addEventListener('message', (event: MessageEvent<ExtensionMessage>) => {
				const message = event.data as ExtensionMessage;
				this.handleMessage(message);
			});
		}
	}

	/**
	 * Get or create the singleton instance
	 */
	static getInstance(): VsCodeApi {
		if (!VsCodeApi.instance) {
			VsCodeApi.instance = new VsCodeApi();
		}
		return VsCodeApi.instance;
	}

	/**
	 * Send a message to the extension
	 */
	sendMessage(message: WebviewMessage): void {
		if (this.vscode) {
			this.vscode.postMessage(message);
		} else {
			console.warn('Cannot send message - VS Code API not available', message);
		}
	}

	/**
	 * Register a handler for a specific message type
	 */
	onMessage(type: string, handler: (payload: any) => void): void {
		if (!this.messageHandlers.has(type)) {
			this.messageHandlers.set(type, []);
		}
		this.messageHandlers.get(type)!.push(handler);
	}

	/**
	 * Handle incoming messages from extension
	 */
	private handleMessage(message: ExtensionMessage): void {
		const handlers = this.messageHandlers.get(message.type) || [];
		handlers.forEach((handler) => {
			try {
				handler(message.payload);
			} catch (error) {
				console.error(`Error in message handler for ${message.type}:`, error);
			}
		});
	}

	/**
	 * Signal that webview is ready to receive messages
	 */
	signalReady(): void {
		this.sendMessage({
			type: 'ready',
			payload: { timestamp: Date.now() },
		});
	}

	/**
	 * Signal a node selection event
	 */
	selectNode(nodeId: string): void {
		this.sendMessage({
			type: 'node-selected',
			payload: { nodeId },
		});
	}

	/**
	 * Signal a node hover event
	 */
	hoverNode(nodeId: string | null): void {
		this.sendMessage({
			type: 'node-hovered',
			payload: { nodeId },
		});
	}

	/**
	 * Signal a zoom change event
	 */
	zoomChanged(scale: number): void {
		this.sendMessage({
			type: 'zoom-changed',
			payload: { scale },
		});
	}

	/**
	 * Send an error message
	 */
	sendError(error: string): void {
		this.sendMessage({
			type: 'error',
			payload: { error },
		});
	}

	/**
	 * Request to load an example file
	 */
	loadExample(filename: string): void {
		this.sendMessage({
			type: 'load-example',
			payload: { filename },
		});
	}
}
