import * as vscode from 'vscode';

const SECRETS_KEY = 'schematex.claudeApiKey';

/**
 * Handles Claude API integration and secure key storage.
 * Uses VS Code Secrets API for secure credential storage.
 */
export class ClaudeIntegration {
	private context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	/**
	 * Retrieves the Claude API key from secure storage.
	 * Prompts user to enter key if not found.
	 */
	async getApiKey(): Promise<string | undefined> {
		// Try to get from secure storage first
		let apiKey = await this.context.secrets.get(SECRETS_KEY);

		if (!apiKey) {
			// Prompt user to enter API key
			apiKey = await this.promptForApiKey();
			if (apiKey) {
				// Store in secure storage
				await this.context.secrets.store(SECRETS_KEY, apiKey);
			}
		}

		return apiKey;
	}

	/**
	 * Prompts the user to enter their Claude API key.
	 */
	private async promptForApiKey(): Promise<string | undefined> {
		const apiKey = await vscode.window.showInputBox({
			prompt: 'Enter your Claude API key',
			password: true,
			ignoreFocusOut: true,
			placeHolder: 'sk-ant-...',
		});

		if (apiKey) {
			vscode.window.showInformationMessage('Claude API key saved securely');
		}

		return apiKey;
	}

	/**
	 * Updates the stored Claude API key.
	 */
	async setApiKey(apiKey: string): Promise<void> {
		await this.context.secrets.store(SECRETS_KEY, apiKey);
		vscode.window.showInformationMessage('Claude API key updated');
	}

	/**
	 * Removes the stored Claude API key.
	 */
	async removeApiKey(): Promise<void> {
		await this.context.secrets.delete(SECRETS_KEY);
		vscode.window.showInformationMessage('Claude API key removed');
	}

	/**
	 * Checks if an API key is configured.
	 */
	async hasApiKey(): Promise<boolean> {
		const apiKey = await this.context.secrets.get(SECRETS_KEY);
		return !!apiKey;
	}

	/**
	 * Registers a command to configure the Claude API key.
	 * TODO: Add UI to allow users to update their API key (#18)
	 */
	registerConfigCommand(): vscode.Disposable {
		return vscode.commands.registerCommand(
			'schematex.configureClaude',
			async () => {
				const apiKey = await this.promptForApiKey();
				if (apiKey) {
					await this.setApiKey(apiKey);
				}
			}
		);
	}
}
