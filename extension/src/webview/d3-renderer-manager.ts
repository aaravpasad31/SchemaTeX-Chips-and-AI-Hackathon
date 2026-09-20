/**
 * D3 Renderer Manager
 * Integrates D3Renderer with React state management and layout engine
 * Handles collapse/expand functionality with automatic re-layout
 *
 * T10 implementation: Interactive expand/collapse of hierarchical modules
 */

import { D3Renderer, ModuleToggleCallback } from './d3-renderer';
import { LayoutEngine } from './layout-engine';
import { Layout, ElkGraph, ElkNode, ElkEdge } from './types/layout';
import { ParserOutput } from '../types/ast';

/**
 * D3RendererManager integrates D3Renderer with React state and layout engine
 */
export class D3RendererManager {
	private renderer: D3Renderer;
	private layoutEngine: LayoutEngine;
	private diagramData: ParserOutput | null = null;
	private currentLayout: Layout | null = null;
	private collapsedModules: Map<string, boolean> = new Map();
	private onCollapsedModulesChange: ((modules: Map<string, boolean>) => void) | null = null;

	constructor(layoutEngine: LayoutEngine = new LayoutEngine()) {
		this.renderer = new D3Renderer();
		this.layoutEngine = layoutEngine;

		// Set up the toggle callback
		this.renderer.setModuleToggleCallback((moduleId: string, isCollapsed: boolean) => {
			this.handleModuleToggle(moduleId, isCollapsed);
		});
	}

	/**
	 * Initialize the renderer
	 * @param containerId - ID of the container element
	 */
	public initialize(containerId: string): void {
		this.renderer.initialize(containerId);
	}

	/**
	 * Set the diagram data
	 * @param data - Parser output containing module structure
	 */
	public setDiagramData(data: ParserOutput): void {
		this.diagramData = data;
	}

	/**
	 * Set the callback for when collapsed modules change
	 * @param callback - Callback function to invoke when modules are toggled
	 */
	public setOnCollapsedModulesChange(callback: (modules: Map<string, boolean>) => void): void {
		this.onCollapsedModulesChange = callback;
	}

	/**
	 * Render the graph with current collapsed state
	 * @param graph - ELK graph data to render
	 */
	public render(graph: ElkGraph): void {
		// Apply collapsed state to renderer
		this.renderer.setAllCollapsedModules(this.collapsedModules);

		// Render the graph
		this.renderer.render(graph);
	}

	/**
	 * Store the current layout for reference
	 * @param layout - Layout data
	 */
	public setCurrentLayout(layout: Layout): void {
		this.currentLayout = layout;
	}

	/**
	 * Handle module toggle (expand/collapse)
	 * Updates the collapsed state and notifies React
	 * Note: For now, uses visual hiding instead of re-layout for performance
	 * Future optimization: implement true re-layout with filtered graph
	 */
	private async handleModuleToggle(moduleId: string, isCollapsed: boolean): Promise<void> {
		// Update the collapsed modules map
		this.collapsedModules.set(moduleId, isCollapsed);

		// Update the renderer's collapsed state
		this.renderer.setModuleCollapsed(moduleId, isCollapsed);

		// Notify React of the state change
		if (this.onCollapsedModulesChange) {
			this.onCollapsedModulesChange(new Map(this.collapsedModules));
		}

		console.log(`Module ${moduleId} ${isCollapsed ? 'collapsed' : 'expanded'}`);

		// TODO: For true re-layout, we would:
		// 1. Filter the ELK graph to exclude collapsed modules' children
		// 2. Re-compute layout with LayoutEngine
		// 3. Re-render with new positions
		//
		// For now, we're just updating the visual state (hiding/showing children)
		// This is simpler and faster but doesn't recompute positions
	}

	/**
	 * Set the collapsed state of a module
	 * @param moduleId - ID of the module
	 * @param isCollapsed - true to collapse, false to expand
	 */
	public setModuleCollapsed(moduleId: string, isCollapsed: boolean): void {
		this.collapsedModules.set(moduleId, isCollapsed);
		this.renderer.setModuleCollapsed(moduleId, isCollapsed);
	}

	/**
	 * Set the collapsed state of all modules
	 * @param modules - Map of module IDs to collapsed state
	 */
	public setAllCollapsedModules(modules: Map<string, boolean>): void {
		this.collapsedModules = new Map(modules);
		this.renderer.setAllCollapsedModules(modules);
	}

	/**
	 * Get the collapsed state of all modules
	 */
	public getCollapsedModules(): Map<string, boolean> {
		return new Map(this.collapsedModules);
	}

	/**
	 * Get the renderer instance
	 */
	public getRenderer(): D3Renderer {
		return this.renderer;
	}

	/**
	 * Get the layout engine instance
	 */
	public getLayoutEngine(): LayoutEngine {
		return this.layoutEngine;
	}

	/**
	 * Enable zoom behavior
	 */
	public enableZoom(): void {
		this.renderer.enableZoom();
	}

	/**
	 * Enable pan behavior
	 */
	public enablePan(): void {
		this.renderer.enablePan();
	}

	/**
	 * Reset zoom
	 */
	public resetZoom(): void {
		this.renderer.resetZoom();
	}

	/**
	 * Get the main D3 group selection for manual manipulation
	 */
	public getMainGroup(): any {
		return this.renderer.getMainGroup();
	}

	/**
	 * Cleanup and destroy resources
	 */
	public destroy(): void {
		this.renderer.destroy();
		this.diagramData = null;
		this.currentLayout = null;
		this.collapsedModules.clear();
	}
}
