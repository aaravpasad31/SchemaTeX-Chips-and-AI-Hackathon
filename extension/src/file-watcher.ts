import * as vscode from 'vscode';

/**
 * Monitors SystemVerilog files for changes and triggers callbacks on save events.
 * Provides a wrapper around VSCode's file system watcher API.
 */
export class FileWatcher {
	private watcher: vscode.FileSystemWatcher | null = null;
	private currentFilePath: string | null = null;
	private onChangeCallback: ((filePath: string) => void) | null = null;
	private disposables: vscode.Disposable[] = [];

	constructor() {
		// Listen for active editor changes
		const editorChangeSubscription = vscode.window.onDidChangeActiveTextEditor(
			(editor) => this.onActiveEditorChanged(editor)
		);
		this.disposables.push(editorChangeSubscription);

		// Watch for file save events globally (all .sv files)
		const globalWatcher = vscode.workspace.createFileSystemWatcher('**/*.sv');
		this.watcher = globalWatcher;

		// Handle file changes (save events)
		const changeSubscription = globalWatcher.onDidChange((uri) => {
			this.onFileChanged(uri);
		});
		this.disposables.push(changeSubscription);

		// Handle file deletions
		const deleteSubscription = globalWatcher.onDidDelete((uri) => {
			this.onFileDeleted(uri);
		});
		this.disposables.push(deleteSubscription);

		// Initialize with the current active editor if it exists
		if (vscode.window.activeTextEditor) {
			this.setCurrentFile(vscode.window.activeTextEditor.document.uri.fsPath);
		}
	}

	/**
	 * Registers a callback to be invoked when a watched file changes.
	 * @param filePath Path to the file to watch
	 * @param onChange Callback invoked with the file path when changes are detected
	 * @returns Disposable to unregister the callback
	 */
	watchFile(filePath: string, onChange: (filePath: string) => void): vscode.Disposable {
		this.currentFilePath = filePath;
		this.onChangeCallback = onChange;

		// Return a disposable to allow the caller to unwatch if needed
		return new vscode.Disposable(() => {
			if (this.currentFilePath === filePath) {
				this.currentFilePath = null;
				this.onChangeCallback = null;
			}
		});
	}

	/**
	 * Sets the current file being watched.
	 * @param filePath Path to the file to watch
	 */
	private setCurrentFile(filePath: string): void {
		// Only watch SystemVerilog files
		if (!filePath.endsWith('.sv')) {
			this.currentFilePath = null;
			return;
		}
		this.currentFilePath = filePath;
	}

	/**
	 * Handles when the active editor changes.
	 * Updates the watched file if the new editor contains a .sv file.
	 */
	private onActiveEditorChanged(editor: vscode.TextEditor | undefined): void {
		if (!editor) {
			// No active editor
			this.currentFilePath = null;
			return;
		}

		const filePath = editor.document.uri.fsPath;

		// Only watch SystemVerilog files
		if (!filePath.endsWith('.sv')) {
			this.currentFilePath = null;
			return;
		}

		// Skip untitled/unsaved files
		if (editor.document.isUntitled) {
			this.currentFilePath = null;
			return;
		}

		this.setCurrentFile(filePath);
	}

	/**
	 * Handles file change events (save).
	 * Triggers the callback if the changed file is the currently watched file.
	 */
	private onFileChanged(uri: vscode.Uri): void {
		const changedPath = uri.fsPath;

		// Only trigger callback if this is the file we're watching
		if (this.currentFilePath && changedPath === this.currentFilePath && this.onChangeCallback) {
			console.log(`[SchemaTeX] File changed detected: ${changedPath}`);
			this.onChangeCallback(changedPath);
		}
	}

	/**
	 * Handles file deletion events.
	 * Stops watching if the deleted file is the currently watched file.
	 */
	private onFileDeleted(uri: vscode.Uri): void {
		const deletedPath = uri.fsPath;

		if (this.currentFilePath && deletedPath === this.currentFilePath) {
			console.log(`[SchemaTeX] Watched file deleted: ${deletedPath}`);
			this.currentFilePath = null;
			this.onChangeCallback = null;
		}
	}

	/**
	 * Disposes the file watcher and cleans up all resources.
	 * Must be called on extension deactivation.
	 */
	dispose(): void {
		// Dispose all subscriptions
		this.disposables.forEach(disposable => disposable.dispose());
		this.disposables = [];

		// Dispose the global watcher
		if (this.watcher) {
			this.watcher.dispose();
			this.watcher = null;
		}

		// Clear callbacks and state
		this.currentFilePath = null;
		this.onChangeCallback = null;
	}
}
