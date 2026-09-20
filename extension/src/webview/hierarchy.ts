/**
 * Hierarchy Manager for handling collapse/expand of nested modules
 * Tracks which modules are collapsed and updates the display accordingly
 */

import { Layout, LayoutNode } from './types/layout';

/**
 * HierarchyManager manages the collapsed/expanded state of modules
 * and handles updating the SVG display based on this state
 */
export class HierarchyManager {
	/** Map of module IDs to their collapsed state (true = collapsed) */
	private collapsedModules = new Map<string, boolean>();
	/** SVG element being managed */
	private svgElement: SVGElement | null = null;
	/** Layout data for reference */
	private layout: Layout | null = null;

	constructor() {
		this.collapsedModules = new Map();
	}

	/**
	 * Set the SVG element and layout to manage
	 */
	setSVGElement(svg: SVGElement, layout: Layout): void {
		this.svgElement = svg;
		this.layout = layout;
	}

	/**
	 * Toggle the collapsed state of a module
	 * @param moduleId - ID of the module to toggle
	 */
	toggleModule(moduleId: string): void {
		const currentState = this.collapsedModules.get(moduleId) || false;
		this.setCollapsed(moduleId, !currentState);
	}

	/**
	 * Set the collapsed state of a module
	 * @param moduleId - ID of the module
	 * @param collapsed - true to collapse, false to expand
	 */
	setCollapsed(moduleId: string, collapsed: boolean): void {
		this.collapsedModules.set(moduleId, collapsed);
		this.updateDisplay();
	}

	/**
	 * Check if a module is collapsed
	 * @param moduleId - ID of the module
	 */
	isCollapsed(moduleId: string): boolean {
		return this.collapsedModules.get(moduleId) || false;
	}

	/**
	 * Get all child nodes of a given module
	 * @param moduleId - ID of the parent module
	 */
	private getChildNodes(moduleId: string): LayoutNode[] {
		if (!this.layout) {
			return [];
		}
		return this.layout.nodes.filter(node => node.parent === moduleId);
	}

	/**
	 * Get all descendant nodes of a given module (recursive)
	 * @param moduleId - ID of the parent module
	 */
	private getDescendantNodes(moduleId: string): LayoutNode[] {
		const descendants: LayoutNode[] = [];
		const queue = [moduleId];

		while (queue.length > 0) {
			const currentId = queue.shift()!;
			const children = this.getChildNodes(currentId);
			descendants.push(...children);
			children.forEach(child => queue.push(child.id));
		}

		return descendants;
	}

	/**
	 * Get all edges connected to a given node
	 * @param nodeId - ID of the node
	 */
	private getConnectedEdges(nodeId: string): string[] {
		if (!this.layout) {
			return [];
		}
		return this.layout.edges
			.filter(edge => edge.source === nodeId || edge.target === nodeId)
			.map((_, idx) => `edge-${idx}`);
	}

	/**
	 * Update the SVG display based on collapsed state
	 * Shows/hides child nodes and connected edges
	 */
	updateDisplay(): void {
		if (!this.svgElement) {
			return;
		}

		// Hide/show nodes and edges based on collapse state
		const nodes = this.svgElement.querySelectorAll('.node');
		const edges = this.svgElement.querySelectorAll('.edge');

		nodes.forEach((nodeElement: Element) => {
			const nodeId = nodeElement.getAttribute('data-id');
			const parent = nodeElement.getAttribute('data-parent');

			if (!nodeId) {
				return;
			}

			// Check if this node should be hidden
			const shouldHide = parent && this.isCollapsed(parent);
			const visibility = shouldHide ? 'hidden' : 'visible';
			(nodeElement as SVGElement).style.visibility = visibility;

			// Also check if this node is a module that might hide its children
			if (this.isCollapsed(nodeId)) {
				const children = this.getChildNodes(nodeId);
				children.forEach(child => {
					const childElement = this.svgElement!.querySelector(
						`[data-id="${child.id}"]`
					) as SVGElement;
					if (childElement) {
						childElement.style.visibility = 'hidden';
					}
				});
			}
		});

		// Hide edges connected to hidden nodes
		edges.forEach((edgeElement: Element) => {
			const source = edgeElement.getAttribute('data-source');
			const target = edgeElement.getAttribute('data-target');

			if (!source || !target) {
				return;
			}

			// Check if source or target is hidden
			const sourceElement = this.svgElement!.querySelector(
				`[data-id="${source}"]`
			) as SVGElement | null;
			const targetElement = this.svgElement!.querySelector(
				`[data-id="${target}"]`
			) as SVGElement | null;

			const sourceHidden = sourceElement && sourceElement.style.visibility === 'hidden';
			const targetHidden = targetElement && targetElement.style.visibility === 'hidden';

			const visibility = sourceHidden || targetHidden ? 'hidden' : 'visible';
			(edgeElement as SVGElement).style.visibility = visibility;
		});
	}

	/**
	 * Reset all collapsed states
	 */
	resetCollapsedState(): void {
		this.collapsedModules.clear();
		this.updateDisplay();
	}

	/**
	 * Get the current state of all collapsed modules
	 */
	getCollapsedState(): Map<string, boolean> {
		return new Map(this.collapsedModules);
	}

	/**
	 * Restore a previously saved collapsed state
	 */
	restoreCollapsedState(state: Map<string, boolean>): void {
		this.collapsedModules = new Map(state);
		this.updateDisplay();
	}
}
