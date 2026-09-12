/**
 * Diagram Canvas Manager
 * Manages SVG canvas lifecycle, sizing, responsiveness, and navigation (zoom/pan)
 * Wraps SVGRenderer and handles DOM insertion, cleanup, and interactivity
 */

import { SVGRenderer } from './svg-renderer';
import { DiagramNavigation } from './navigation';
import { HierarchyManager } from './hierarchy';
import { DiagramInteraction } from './interaction';
import { Layout } from './types/layout';

/**
 * Canvas configuration options
 */
interface CanvasConfig {
	/** Minimum canvas width in pixels */
	minWidth: number;
	/** Minimum canvas height in pixels */
	minHeight: number;
	/** Enable zoom functionality (prepared for interactivity) */
	enableZoom: boolean;
	/** Enable pan functionality (prepared for interactivity) */
	enablePan: boolean;
	/** Padding around diagram in pixels */
	padding: number;
}

/**
 * Default canvas configuration
 */
const DEFAULT_CONFIG: CanvasConfig = {
	minWidth: 400,
	minHeight: 300,
	enableZoom: true,
	enablePan: true,
	padding: 20,
};

/**
 * DiagramCanvas manages the SVG rendering and DOM lifecycle
 */
export class DiagramCanvas {
	private renderer: SVGRenderer;
	private config: CanvasConfig;
	private svgElement: SVGElement | null = null;
	private container: HTMLElement | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private navigation: DiagramNavigation;
	private hierarchyManager: HierarchyManager;
	private interaction: DiagramInteraction;
	private isDragging: boolean = false;
	private dragStartX: number = 0;
	private dragStartY: number = 0;

	constructor(config: Partial<CanvasConfig> = {}) {
		this.renderer = new SVGRenderer();
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.navigation = new DiagramNavigation();
		this.hierarchyManager = new HierarchyManager();
		this.interaction = new DiagramInteraction();
	}

	/**
	 * Render layout to SVG and insert into container
	 * @param layout - Layout data to render
	 * @param containerElement - DOM element to insert SVG into
	 */
	render(layout: Layout, containerElement: HTMLElement): SVGElement {
		this.container = containerElement;

		// Render SVG using the renderer
		this.svgElement = this.renderer.render(layout, containerElement);

		// Initialize HierarchyManager with the SVG and layout
		this.hierarchyManager.setSVGElement(this.svgElement, layout);

		// Set up interactive features
		this.setupInteractivity(layout);

		// Set up responsive sizing
		this.setupResponsiveness();

		return this.svgElement;
	}

	/**
	 * Setup interactive features (hover, click, zoom, pan, signal highlighting, etc.)
	 */
	private setupInteractivity(layout: Layout): void {
		if (!this.svgElement || !this.container) {
			return;
		}

		// Setup signal/net interaction handlers
		this.interaction.setupSignalHandlers(this.svgElement, layout);

		// Add hover effects
		const nodes = this.svgElement.querySelectorAll('.node');
		nodes.forEach((node) => {
			node.addEventListener('mouseenter', () => {
				node.classList.add('hover');
			});
			node.addEventListener('mouseleave', () => {
				node.classList.remove('hover');
			});
		});

		// Add click handlers (data attributes for event processing)
		nodes.forEach((node) => {
			node.addEventListener('click', (e) => {
				// Check if click was on collapse button
				const target = e.target as SVGElement;
				if (target.closest('.collapse-button-group')) {
					e.stopPropagation();
					return;
				}

				// Only select node if not dragging
				if (!this.isDragging) {
					const nodeId = node.getAttribute('data-id');
					if (nodeId) {
						this.dispatchNodeSelected(nodeId);
					}
				}
			});
		});

		// Add collapse button handlers
		const collapseButtons = this.svgElement.querySelectorAll('.collapse-button-group');
		collapseButtons.forEach((button) => {
			button.addEventListener('click', (event: Event) => {
				event.stopPropagation();
				const moduleId = button.getAttribute('data-module-id');
				if (moduleId) {
					this.hierarchyManager.toggleModule(moduleId);
					this.updateCollapseButtonState(button as SVGGElement);
				}
			});

			// Add hover effects for collapse button
			button.addEventListener('mouseenter', () => {
				const circle = button.querySelector('.collapse-button-bg') as SVGElement;
				if (circle) {
					circle.setAttribute('fill-opacity', '0.9');
				}
			});

			button.addEventListener('mouseleave', () => {
				const circle = button.querySelector('.collapse-button-bg') as SVGElement;
				if (circle) {
					circle.setAttribute('fill-opacity', '1');
				}
			});
		});

		// Setup navigation handlers (zoom, pan, fit-to-screen)
		this.setupNavigationHandlers();
	}

	/**
	 * Setup navigation handlers (wheel zoom, mouse drag pan, double-click fit)
	 */
	private setupNavigationHandlers(): void {
		if (!this.svgElement || !this.container) {
			return;
		}

		// Wheel zoom
		this.container.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

		// Mouse drag pan
		this.svgElement.addEventListener('mousedown', (e) => this.handleMouseDown(e));
		document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
		document.addEventListener('mouseup', () => this.handleMouseUp());

		// Double-click fit-to-screen
		this.container.addEventListener('dblclick', () => this.fitToScreen());

		// Keyboard shortcuts
		document.addEventListener('keydown', (e) => this.handleKeyDown(e));
	}

	/**
	 * Handle mouse wheel zoom
	 */
	private handleWheel(e: WheelEvent): void {
		e.preventDefault();

		// Zoom based on wheel direction
		if (e.deltaY < 0) {
			this.navigation.zoomIn();
		} else {
			this.navigation.zoomOut();
		}

		this.applyTransform();
	}

	/**
	 * Handle mouse down (start pan)
	 */
	private handleMouseDown(e: MouseEvent): void {
		// Only pan with middle mouse or secondary button or ctrl+left
		if (e.button === 1 || e.button === 2 || (e.button === 0 && e.ctrlKey)) {
			this.isDragging = true;
			this.dragStartX = e.clientX;
			this.dragStartY = e.clientY;
			if (this.svgElement) {
				this.svgElement.classList.add('dragging');
			}
			e.preventDefault();
		}
	}

	/**
	 * Handle mouse move (pan)
	 */
	private handleMouseMove(e: MouseEvent): void {
		if (!this.isDragging) {
			return;
		}

		const dx = e.clientX - this.dragStartX;
		const dy = e.clientY - this.dragStartY;

		this.navigation.pan(dx, dy);

		this.dragStartX = e.clientX;
		this.dragStartY = e.clientY;

		this.applyTransform();
	}

	/**
	 * Handle mouse up (stop pan)
	 */
	private handleMouseUp(): void {
		this.isDragging = false;
		if (this.svgElement) {
			this.svgElement.classList.remove('dragging');
		}
	}

	/**
	 * Handle keyboard shortcuts
	 */
	private handleKeyDown(e: KeyboardEvent): void {
		// Only handle if this diagram canvas is focused
		if (!this.container || !this.container.contains(document.activeElement)) {
			// Check if it's a global shortcut
			if (e.code === 'Home') {
				// Home key always works
				this.navigation.reset();
				this.applyTransform();
			}
			return;
		}

		switch (e.code) {
			case 'Equal':
			case 'NumpadAdd':
			case 'Plus':
				e.preventDefault();
				this.navigation.zoomIn();
				this.applyTransform();
				break;
			case 'Minus':
			case 'NumpadSubtract':
				e.preventDefault();
				this.navigation.zoomOut();
				this.applyTransform();
				break;
			case 'Home':
				e.preventDefault();
				this.navigation.reset();
				this.applyTransform();
				break;
			default:
				break;
		}
	}

	/**
	 * Fit diagram to screen
	 */
	private fitToScreen(): void {
		if (!this.container || !this.svgElement) {
			return;
		}

		const bounds = this.renderer.getSVGBounds();
		if (!bounds) {
			return;
		}

		const containerRect = this.container.getBoundingClientRect();
		this.navigation.fitToScreen(
			{ x: 0, y: 0, width: bounds.width, height: bounds.height },
			{ width: containerRect.width, height: containerRect.height }
		);

		this.applyTransform();
	}

	/**
	 * Apply navigation transform to SVG
	 */
	private applyTransform(): void {
		if (!this.svgElement) {
			return;
		}

		const transform = this.navigation.getTransform();
		this.svgElement.style.transform = transform;
		this.svgElement.style.transformOrigin = '0 0';
		this.svgElement.style.transition = 'transform 0.1s ease-out';
	}

	/**
	 * Setup responsive sizing
	 */
	private setupResponsiveness(): void {
		if (!this.container) {
			return;
		}

		// Clean up previous observer if any
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}

		// Observe container size changes
		this.resizeObserver = new ResizeObserver(() => {
			this.updateSVGSize();
		});

		this.resizeObserver.observe(this.container);

		// Initial size update
		this.updateSVGSize();
	}

	/**
	 * Update SVG size based on container
	 */
	private updateSVGSize(): void {
		if (!this.svgElement || !this.container) {
			return;
		}

		const containerRect = this.container.getBoundingClientRect();
		const width = Math.max(containerRect.width, this.config.minWidth);
		const height = Math.max(containerRect.height, this.config.minHeight);

		this.svgElement.setAttribute('width', String(width));
		this.svgElement.setAttribute('height', String(height));
	}

	/**
	 * Dispatch custom event when node is selected
	 */
	private dispatchNodeSelected(nodeId: string): void {
		const event = new CustomEvent('nodeSelected', {
			detail: { nodeId },
		});
		if (this.container) {
			this.container.dispatchEvent(event);
		}
	}

	/**
	 * Update collapse button state to show correct +/- symbol
	 */
	private updateCollapseButtonState(button: SVGGElement): void {
		const moduleId = button.getAttribute('data-module-id');
		if (!moduleId) {
			return;
		}

		const isCollapsed = this.hierarchyManager.isCollapsed(moduleId);
		const textElement = button.querySelector('.collapse-button-text') as SVGTextElement;

		if (textElement) {
			textElement.textContent = isCollapsed ? '−' : '+';
		}

		button.setAttribute('data-collapsed', String(isCollapsed));
	}

	/**
	 * Clear the canvas
	 */
	clear(): void {
		if (this.container) {
			this.container.innerHTML = '';
		}
		this.svgElement = null;

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
	}

	/**
	 * Get the current SVG element
	 */
	getSVG(): SVGElement | null {
		return this.svgElement;
	}

	/**
	 * Get the renderer instance
	 */
	getRenderer(): SVGRenderer {
		return this.renderer;
	}

	/**
	 * Get the navigation instance
	 */
	getNavigation(): DiagramNavigation {
		return this.navigation;
	}

	/**
	 * Get the interaction instance
	 */
	getInteraction(): DiagramInteraction {
		return this.interaction;
	}

	/**
	 * Get the hierarchy manager instance
	 */
	getHierarchyManager(): HierarchyManager {
		return this.hierarchyManager;
	}

	/**
	 * Update canvas configuration
	 */
	setConfig(config: Partial<CanvasConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): CanvasConfig {
		return { ...this.config };
	}

	/**
	 * Reset navigation to default state
	 */
	resetNavigation(): void {
		this.navigation.reset();
		this.applyTransform();
	}

	/**
	 * Cleanup resources on unmount
	 */
	destroy(): void {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
		// Remove event listeners
		if (this.container) {
			this.container.removeEventListener('wheel', (e) => this.handleWheel(e));
			this.container.removeEventListener('dblclick', () => this.fitToScreen());
		}
		if (this.svgElement) {
			this.svgElement.removeEventListener('mousedown', (e) => this.handleMouseDown(e));
		}
		document.removeEventListener('mousemove', (e) => this.handleMouseMove(e));
		document.removeEventListener('mouseup', () => this.handleMouseUp());
		document.removeEventListener('keydown', (e) => this.handleKeyDown(e));
		this.clear();
		this.svgElement = null;
		this.container = null;
	}
}
