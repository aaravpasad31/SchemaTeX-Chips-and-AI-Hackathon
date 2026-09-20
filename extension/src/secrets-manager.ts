import * as vscode from 'vscode';

const SECRETS_KEY = 'schematex.claudeApiKey';

/**
 * Manages secure storage and retrieval of the Claude API key.
 * Uses VS Code Secrets API for encryption and secure storage.
 */
export class SecretsManager {
	private context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	/**
	 * Stores the Claude API key securely in VS Code Secrets.
	 * @param key The Claude API key to store
	 */
	async storeApiKey(key: string): Promise<void> {
		if (!key || key.trim().length === 0) {
			throw new Error('API key cannot be empty');
		}
		await this.context.secrets.store(SECRETS_KEY, key);
	}

	/**
	 * Retrieves the Claude API key from secure storage.
	 * @returns The API key if stored, undefined otherwise
	 */
	async getApiKey(): Promise<string | undefined> {
		return this.context.secrets.get(SECRETS_KEY);
	}

	/**
	 * Clears the stored Claude API key.
	 */
	async clearApiKey(): Promise<void> {
		await this.context.secrets.delete(SECRETS_KEY);
	}

	/**
	 * Checks if an API key is configured.
	 * @returns True if an API key is stored, false otherwise
	 */
	async hasApiKey(): Promise<boolean> {
		const key = await this.getApiKey();
		return !!key;
	}
}
