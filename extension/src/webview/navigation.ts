/**
 * Diagram Navigation System
 * Manages zoom, pan, and fit-to-screen transformations for SVG diagrams.
 */

/**
 * Bounds information for SVG diagrams
 */
export interface SVGBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Container bounds (viewport)
 */
export interface ContainerBounds {
	width: number;
	height: number;
}

/**
 * Navigation state
 */
export interface NavigationState {
	zoom: number; // 1.0 = 100%
	panX: number; // in viewport coordinates
	panY: number; // in viewport coordinates
}

/**
 * DiagramNavigation manages zoom, pan, and fit-to-screen operations
 */
export class DiagramNavigation {
	private zoom: number = 1.0;
	private panX: number = 0;
	private panY: number = 0;

	// Configuration
	private readonly minZoom: number = 0.2; // 20%
	private readonly maxZoom: number = 5.0; // 500%
	private readonly zoomStep: number = 1.2; // 20% per step
	private readonly padding: number = 20; // pixels around diagram when fitting

	constructor() {
		this.reset();
	}

	/**
	 * Zoom in by one step
	 */
	zoomIn(): void {
		this.setZoom(this.zoom * this.zoomStep);
	}

	/**
	 * Zoom out by one step
	 */
	zoomOut(): void {
		this.setZoom(this.zoom / this.zoomStep);
	}

	/**
	 * Set zoom level with constraints
	 * @param newZoom - Zoom level (1.0 = 100%)
	 */
	setZoom(newZoom: number): void {
		this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
	}

	/**
	 * Get current zoom level
	 */
	getZoom(): number {
		return this.zoom;
	}

	/**
	 * Pan by delta
	 * @param dx - Change in x (pixels)
	 * @param dy - Change in y (pixels)
	 */
	pan(dx: number, dy: number): void {
		this.panX += dx;
		this.panY += dy;
	}

	/**
	 * Set pan position
	 * @param x - Pan X in viewport coordinates
	 * @param y - Pan Y in viewport coordinates
	 */
	setPan(x: number, y: number): void {
		this.panX = x;
		this.panY = y;
	}

	/**
	 * Get current pan offset
	 */
	getPan(): { x: number; y: number } {
		return { x: this.panX, y: this.panY };
	}

	/**
	 * Fit entire diagram to screen
	 * @param svgBounds - Bounds of the SVG diagram
	 * @param containerBounds - Bounds of the container (viewport)
	 */
	fitToScreen(svgBounds: SVGBounds, containerBounds: ContainerBounds): void {
		// Account for padding
		const availableWidth = containerBounds.width - this.padding * 2;
		const availableHeight = containerBounds.height - this.padding * 2;

		// Calculate zoom to fit
		const zoomX = availableWidth / svgBounds.width;
		const zoomY = availableHeight / svgBounds.height;
		const newZoom = Math.min(zoomX, zoomY);

		// Set zoom
		this.setZoom(newZoom);

		// Center the diagram
		const scaledWidth = svgBounds.width * this.zoom;
		const scaledHeight = svgBounds.height * this.zoom;

		const centerX = (containerBounds.width - scaledWidth) / 2 - svgBounds.x * this.zoom;
		const centerY = (containerBounds.height - scaledHeight) / 2 - svgBounds.y * this.zoom;

		this.panX = centerX;
		this.panY = centerY;
	}

	/**
	 * Reset to default state (no zoom, no pan)
	 */
	reset(): void {
		this.zoom = 1.0;
		this.panX = 0;
		this.panY = 0;
	}

	/**
	 * Get current state
	 */
	getState(): NavigationState {
		return {
			zoom: this.zoom,
			panX: this.panX,
			panY: this.panY,
		};
	}

	/**
	 * Get SVG transform string for applying to SVG element
	 * @returns CSS transform string
	 */
	getTransform(): string {
		return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
	}

	/**
	 * Get SVG transform for transform attribute
	 * @returns Transform attribute value
	 */
	getSVGTransform(): string {
		return `translate(${this.panX} ${this.panY}) scale(${this.zoom})`;
	}
}
