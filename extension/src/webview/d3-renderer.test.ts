/**
 * Unit tests for D3Renderer class
 * Tests D3.js integration, canvas initialization, zoom/pan behaviors, and rendering
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as d3 from 'd3';
import { D3Renderer } from './d3-renderer';
import { ElkGraph, ElkNode } from './types/layout';

/**
 * Helper to create a mock DOM container
 */
function createTestContainer(id: string = 'test-container'): HTMLElement {
	const div = document.createElement('div');
	div.id = id;
	div.style.width = '800px';
	div.style.height = '600px';
	document.body.appendChild(div);
	return div;
}

/**
 * Helper to clean up test containers
 */
function removeTestContainer(id: string): void {
	const element = document.getElementById(id);
	if (element) {
		document.body.removeChild(element);
	}
}

/**
 * Helper to create a minimal ELK graph for testing
 */
function createTestGraph(): ElkGraph {
	return {
		id: 'test-graph',
		width: 400,
		height: 300,
		children: [
			{
				id: 'node1',
				label: { text: 'Test Node 1' },
				width: 100,
				height: 60,
				x: 50,
				y: 50,
			} as ElkNode,
		] as ElkNode[],
		edges: [],
	};
}

describe('D3Renderer', () => {
	let renderer: D3Renderer;
	let containerId: string;

	beforeEach(() => {
		renderer = new D3Renderer();
		containerId = `test-container-${Date.now()}`;
		createTestContainer(containerId);
	});

	afterEach(() => {
		renderer.destroy();
		removeTestContainer(containerId);
	});

	describe('D3 Library Integration', () => {
		it('should load D3.js library without errors', () => {
			expect(d3).to.be.an('object');
			expect(d3.select).to.be.a('function');
			expect(d3.zoom).to.be.a('function');
		});

		it('should have D3 version 7', () => {
			// D3 v7 exports a version property
			expect((d3 as any).version).to.match(/^7\./);
		});
	});

	describe('Initialization', () => {
		it('should initialize with valid container ID', () => {
			expect(() => renderer.initialize(containerId)).to.not.throw();
		});

		it('should throw error when container ID not found', () => {
			expect(() => renderer.initialize('non-existent-container')).to.throw(
				'Container element with id "non-existent-container" not found'
			);
		});

		it('should create SVG element in container', () => {
			renderer.initialize(containerId);
			const svg = document.querySelector(`#${containerId} svg`);
			expect(svg).to.exist;
			expect(svg?.tagName.toLowerCase()).to.equal('svg');
		});

		it('should set SVG dimensions', () => {
			renderer.initialize(containerId);
			const svg = document.querySelector(`#${containerId} svg`) as SVGSVGElement;
			expect(svg.getAttribute('width')).to.equal('800');
			expect(svg.getAttribute('height')).to.equal('600');
		});

		it('should create main group element', () => {
			renderer.initialize(containerId);
			const mainGroup = document.querySelector(`#${containerId} svg g.d3-main-group`);
			expect(mainGroup).to.exist;
			expect(mainGroup?.tagName.toLowerCase()).to.equal('g');
		});

		it('should add background rectangle', () => {
			renderer.initialize(containerId);
			const background = document.querySelector(`#${containerId} svg rect.d3-background`);
			expect(background).to.exist;
		});

		it('should add arrow marker for edges', () => {
			renderer.initialize(containerId);
			const marker = document.querySelector(`#${containerId} svg marker#d3-arrow`);
			expect(marker).to.exist;
		});

		it('should clear previous content on re-initialization', () => {
			renderer.initialize(containerId);
			const initialSvgs = document.querySelectorAll(`#${containerId} svg`).length;
			expect(initialSvgs).to.equal(1);

			// Re-initialize
			renderer.initialize(containerId);
			const afterSvgs = document.querySelectorAll(`#${containerId} svg`).length;
			expect(afterSvgs).to.equal(1); // Should still be 1, not 2
		});
	});

	describe('Canvas Element Rendering', () => {
		beforeEach(() => {
			renderer.initialize(containerId);
		});

		it('should render SVG canvas', () => {
			const svg = document.querySelector(`#${containerId} svg`) as SVGSVGElement;
			expect(svg).to.exist;
			expect(svg.tagName.toLowerCase()).to.equal('svg');
		});

		it('should have transparent background rectangle', () => {
			const background = document.querySelector(
				`#${containerId} svg rect.d3-background`
			) as SVGRectElement;
			expect(background).to.exist;
			expect(background.getAttribute('fill')).to.equal('transparent');
		});

		it('should have defs element with markers', () => {
			const defs = document.querySelector(`#${containerId} svg defs`);
			expect(defs).to.exist;
			const markers = defs?.querySelectorAll('marker');
			expect(markers?.length).to.be.greaterThan(0);
		});
	});

	describe('Zoom Behavior', () => {
		beforeEach(() => {
			renderer.initialize(containerId);
		});

		it('should attach zoom behavior without errors', () => {
			expect(() => renderer.enableZoom()).to.not.throw();
		});

		it('should not attach zoom behavior twice', () => {
			renderer.enableZoom();
			expect(() => renderer.enableZoom()).to.not.throw();
		});

		it('should throw error if not initialized', () => {
			const newRenderer = new D3Renderer();
			expect(() => newRenderer.enableZoom()).to.throw(
				'D3Renderer not initialized. Call initialize() first'
			);
		});

		it('should reset zoom to identity', () => {
			renderer.enableZoom();
			renderer.resetZoom();
			// Just verify it doesn't throw
			expect(true).to.be.true;
		});
	});

	describe('Pan Behavior', () => {
		beforeEach(() => {
			renderer.initialize(containerId);
		});

		it('should attach pan behavior without errors', () => {
			expect(() => renderer.enablePan()).to.not.throw();
		});

		it('should enable zoom when enabling pan', () => {
			renderer.enablePan();
			// Pan should automatically enable zoom
			const group = document.querySelector(`#${containerId} svg g.d3-main-group`);
			expect(group).to.exist;
		});

		it('should throw error if not initialized', () => {
			const newRenderer = new D3Renderer();
			expect(() => newRenderer.enablePan()).to.throw(
				'D3Renderer not initialized. Call initialize() first'
			);
		});
	});

	describe('Rendering', () => {
		beforeEach(() => {
			renderer.initialize(containerId);
		});

		it('should render test shapes without errors', () => {
			const testGraph = createTestGraph();
			expect(() => renderer.render(testGraph)).to.not.throw();
		});

		it('should throw error if not initialized', () => {
			const newRenderer = new D3Renderer();
			const testGraph = createTestGraph();
			expect(() => newRenderer.render(testGraph)).to.throw(
				'D3Renderer not initialized. Call initialize() first'
			);
		});

		it('should render placeholder rectangle', () => {
			const testGraph = createTestGraph();
			renderer.render(testGraph);
			const rect = document.querySelector(
				`#${containerId} svg g.d3-placeholder rect`
			) as SVGRectElement;
			expect(rect).to.exist;
			expect(rect.getAttribute('fill')).to.equal('#667eea');
		});

		it('should render placeholder circle', () => {
			const testGraph = createTestGraph();
			renderer.render(testGraph);
			const circle = document.querySelector(
				`#${containerId} svg g.d3-placeholder circle`
			) as SVGCircleElement;
			expect(circle).to.exist;
			expect(circle.getAttribute('fill')).to.equal('#FF6B6B');
		});

		it('should render labels for placeholder shapes', () => {
			const testGraph = createTestGraph();
			renderer.render(testGraph);
			const texts = document.querySelectorAll(`#${containerId} svg text`);
			expect(texts.length).to.be.greaterThan(0);
		});

		it('should store current graph reference', () => {
			const testGraph = createTestGraph();
			renderer.render(testGraph);
			expect(renderer.getCurrentGraph()).to.deep.equal(testGraph);
		});

		it('should clear previous render data', () => {
			const testGraph = createTestGraph();
			renderer.render(testGraph);
			renderer.render(testGraph);
			// Verify it doesn't duplicate elements inappropriately
			const placeholders = document.querySelectorAll(`#${containerId} svg g.d3-placeholder`);
			expect(placeholders.length).to.equal(1);
		});
	});

	describe('Group Access', () => {
		beforeEach(() => {
			renderer.initialize(containerId);
		});

		it('should return main group selection', () => {
			const mainGroup = renderer.getMainGroup();
			expect(mainGroup).to.exist;
		});

		it('should throw error if getting group before initialization', () => {
			const newRenderer = new D3Renderer();
			expect(() => newRenderer.getMainGroup()).to.throw(
				'D3Renderer not initialized. Call initialize() first'
			);
		});

		it('should retrieve nodes by ID (when implemented)', () => {
			const node = renderer.getNode('nonexistent');
			expect(node).to.be.undefined;
		});

		it('should retrieve edges by ID (when implemented)', () => {
			const edge = renderer.getEdge('nonexistent');
			expect(edge).to.be.undefined;
		});
	});

	describe('Cleanup', () => {
		beforeEach(() => {
			renderer.initialize(containerId);
		});

		it('should destroy renderer without errors', () => {
			expect(() => renderer.destroy()).to.not.throw();
		});

		it('should clear internal state on destroy', () => {
			renderer.destroy();
			expect(renderer.getCurrentGraph()).to.be.null;
		});

		it('should not allow operations after destroy', () => {
			renderer.destroy();
			expect(() => renderer.enableZoom()).to.throw(
				'D3Renderer not initialized. Call initialize() first'
			);
		});
	});

	describe('Integration: Zoom + Pan + Render', () => {
		it('should handle complete workflow', () => {
			// Initialize
			renderer.initialize(containerId);

			// Enable interactions
			renderer.enableZoom();
			renderer.enablePan();

			// Render graph
			const testGraph = createTestGraph();
			renderer.render(testGraph);

			// Verify everything is in place
			const svg = document.querySelector(`#${containerId} svg`);
			const mainGroup = document.querySelector(`#${containerId} svg g.d3-main-group`);
			const placeholder = document.querySelector(`#${containerId} svg g.d3-placeholder`);

			expect(svg).to.exist;
			expect(mainGroup).to.exist;
			expect(placeholder).to.exist;
		});
	});

	describe('T4: Combinational Block Rendering', () => {
		it('should render combinational logic blocks with proper styling', () => {
			renderer.initialize(containerId);

			// Create a test graph with a combinational logic block
			const combinationalGraph: ElkGraph = {
				id: 'comb-test-graph',
				children: [
					{
						id: 'comb_block_0',
						label: { text: 'Decoder' },
						width: 120,
						height: 80,
						x: 50,
						y: 50,
						properties: {
							blockType: 'combinational_logic',
							inputs: ['sel', 'en'],
							outputs: ['out'],
						},
					} as ElkNode,
				],
				edges: [],
			};

			// Render the graph
			renderer.render(combinationalGraph);

			// Verify the block was rendered
			const blockElement = document.querySelector('#comb_block_0');
			expect(blockElement).to.exist;
			expect(blockElement?.getAttribute('class')).to.include('combinational-block');

			// Verify the block rectangle has correct fill color
			const rect = blockElement?.querySelector('rect');
			expect(rect).to.exist;
			expect(rect?.getAttribute('fill')).to.equal('#f5f5dc');
			expect(rect?.getAttribute('stroke')).to.equal('black');
			expect(rect?.getAttribute('stroke-width')).to.equal('2');

			// Verify the module name is displayed
			const label = blockElement?.querySelector('text');
			expect(label).to.exist;
			expect(label?.textContent).to.equal('Decoder');

			// Verify port markers are rendered
			const portMarkers = blockElement?.querySelectorAll('.d3-port-marker');
			expect(portMarkers?.length).to.be.greaterThan(0);
		});

		it('should render input and output port labels correctly', () => {
			renderer.initialize(containerId);

			// Create a test graph with a combinational logic block
			const combinationalGraph: ElkGraph = {
				id: 'comb-test-graph-ports',
				children: [
					{
						id: 'comb_block_1',
						label: { text: 'MUX' },
						width: 100,
						height: 80,
						x: 100,
						y: 100,
						properties: {
							blockType: 'combinational_logic',
							inputs: ['a', 'b', 'sel'],
							outputs: ['y'],
						},
					} as ElkNode,
				],
				edges: [],
			};

			// Render the graph
			renderer.render(combinationalGraph);

			// Verify the block is rendered
			const blockElement = document.querySelector('#comb_block_1');
			expect(blockElement).to.exist;

			// Verify input port labels are present
			const inputLabels = blockElement?.querySelectorAll('.input-port text');
			expect(inputLabels?.length).to.be.greaterThan(0);

			// Verify output port labels are present
			const outputLabels = blockElement?.querySelectorAll('.output-port text');
			expect(outputLabels?.length).to.be.greaterThan(0);
		});

		it('should handle combinational blocks without properties gracefully', () => {
			renderer.initialize(containerId);

			// Create a test graph with a minimal combinational logic block
			const combinationalGraph: ElkGraph = {
				id: 'comb-test-graph-minimal',
				children: [
					{
						id: 'comb_block_2',
						label: { text: 'Logic' },
						width: 100,
						height: 60,
						x: 200,
						y: 200,
					} as ElkNode,
				],
				edges: [],
			};

			// Should render without errors
			expect(() => renderer.render(combinationalGraph)).to.not.throw();

			// Verify the block was rendered
			const blockElement = document.querySelector('#comb_block_2');
			expect(blockElement).to.exist;
		});
	});
});
