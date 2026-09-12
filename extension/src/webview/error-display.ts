import { ParserError } from '../types/ast';

/**
 * Handles error display and interaction in the webview
 */
export class ErrorDisplay {
	private container: HTMLElement | null = null;
	private errors: ParserError[] = [];
	private onErrorClick: ((error: ParserError, index: number) => void) | null = null;

	/**
	 * Initialize error display with a container element
	 */
	initialize(container: HTMLElement): void {
		this.container = container;
	}

	/**
	 * Display errors in the webview
	 */
	showErrors(errors: ParserError[]): void {
		this.errors = errors;

		if (!this.container) {
			console.warn('[ErrorDisplay] Container not initialized');
			return;
		}

		if (errors.length === 0) {
			this.container.innerHTML = '';
			this.container.style.display = 'none';
			return;
		}

		// Create error panel
		const errorPanel = this.createErrorPanel(errors);
		this.container.innerHTML = '';
		this.container.appendChild(errorPanel);
		this.container.style.display = 'block';
	}

	/**
	 * Create the error panel HTML
	 */
	private createErrorPanel(errors: ParserError[]): HTMLElement {
		const panel = document.createElement('div');
		panel.className = 'error-list';

		errors.forEach((error, index) => {
			const item = this.createErrorItem(error, index);
			panel.appendChild(item);
		});

		return panel;
	}

	/**
	 * Create a single error item
	 */
	private createErrorItem(error: ParserError, index: number): HTMLElement {
		const item = document.createElement('div');
		item.className = `error-item error-type-${error.type}`;
		item.setAttribute('data-error-index', String(index));

		// Content wrapper
		const content = document.createElement('div');
		content.className = 'error-item-content';

		// Error location (line:column)
		const location = document.createElement('div');
		location.className = 'error-location';
		location.textContent = `Line ${error.line}, Col ${error.column}`;
		content.appendChild(location);

		// Error message
		const message = document.createElement('div');
		message.className = 'error-message';
		message.textContent = error.message;
		content.appendChild(message);

		// Error type badge (right side)
		const typeBadge = document.createElement('span');
		typeBadge.className = `error-type-badge error-type-${error.type}`;
		const typeLabel = error.type === 'parse-error' ? 'ERROR' :
		                   error.type === 'unsupported' ? 'UNSUPPORTED' : 'WARNING';
		typeBadge.textContent = typeLabel;

		// Add click handler
		item.addEventListener('click', () => {
			this.highlightError(index);
			if (this.onErrorClick) {
				this.onErrorClick(error, index);
			}
		});

		item.appendChild(content);
		item.appendChild(typeBadge);

		return item;
	}

	/**
	 * Highlight an error in the error panel
	 */
	highlightError(errorIndex: number): void {
		if (!this.container) {
			return;
		}

		// Remove previous highlights
		const previousHighlights = this.container.querySelectorAll('.error-item.highlighted');
		previousHighlights.forEach(item => item.classList.remove('highlighted'));

		// Add highlight to current error
		const errorItem = this.container.querySelector(`[data-error-index="${errorIndex}"]`);
		if (errorItem) {
			errorItem.classList.add('highlighted');
			errorItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}

	/**
	 * Set callback for error clicks
	 */
	setOnErrorClick(callback: (error: ParserError, index: number) => void): void {
		this.onErrorClick = callback;
	}

	/**
	 * Get error count
	 */
	getErrorCount(): number {
		return this.errors.length;
	}

	/**
	 * Clear all errors
	 */
	clear(): void {
		this.errors = [];
		if (this.container) {
			this.container.innerHTML = '';
			this.container.style.display = 'none';
		}
	}

	/**
	 * Get errors by type
	 */
	getErrorsByType(type: 'parse-error' | 'unsupported' | 'warning'): ParserError[] {
		return this.errors.filter(e => e.type === type);
	}

	/**
	 * Get summary stats
	 */
	getSummary(): { parseErrors: number; unsupported: number; warnings: number } {
		return {
			parseErrors: this.getErrorsByType('parse-error').length,
			unsupported: this.getErrorsByType('unsupported').length,
			warnings: this.getErrorsByType('warning').length,
		};
	}
}
