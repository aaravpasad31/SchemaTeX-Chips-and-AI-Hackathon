/**
 * Test suite for D3Renderer hierarchical rendering (T6)
 * Tests hierarchical container rendering, nested instances, port rendering, and edge routing
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as d3 from 'd3';
import { D3Renderer } from './d3-renderer';
import { ElkGraph, ElkNode, ElkEdge } from './types/layout';

/**
 * Helper to create a mock DOM container
 */
function createTestContainer(id: string = 'test-container'): HTMLElement {
	const div = document.createElement('div');
	div.id = id;
	div.style.width = '1000px';
	div.style.height = '800px';
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
 * Create a hierarchical ELK graph for processor example
 */
function createProcessorGraph(): ElkGraph {
	return {
		id: 'processor_graph',
		width: 800,
		height: 600,
		children: [
			{
				id: 'processor',
				label: 'processor',
				type: 'hierarchical_container',
				properties: { type: 'hierarchical_container' },
				width: 700,
				height: 500,
				x: 50,
				y: 50,
				ports: [
					{
						id: 'port_clk',
						label: 'clk',
						x: 700,
						y: 100,
						properties: { direction: 'input' },
					},
					{
						id: 'port_reset',
						label: 'reset',
						x: 700,
						y: 130,
						properties: { direction: 'input' },
					},
					{
						id: 'port_addr',
						label: 'addr[31:0]',
						x: 700,
						y: 160,
						properties: { direction: 'input' },
					},
					{
						id: 'port_data_in',
						label: 'data_in[31:0]',
						x: 700,
						y: 190,
						properties: { direction: 'input' },
					},
					{
						id: 'port_data_out',
						label: 'data_out[31:0]',
						x: 700,
						y: 220,
						properties: { direction: 'output' },
					},
					{
						id: 'port_ready',
						label: 'ready',
						x: 700,
						y: 250,
						properties: { direction: 'output' },
					},
				],
				children: [
					{
						id: 'alu_inst',
						label: 'alu_inst',
						type: 'instance',
						properties: { type: 'instance', moduleName: 'alu' },
						width: 120,
						height: 80,
						x: 80,
						y: 80,
						ports: [
							{
								id: 'alu_a',
								label: 'a',
								x: 0,
								y: 20,
								properties: { direction: 'input' },
							},
							{
								id: 'alu_b',
								label: 'b',
								x: 0,
								y: 50,
								properties: { direction: 'input' },
							},
							{
								id: 'alu_result',
								label: 'result[31:0]',
								x: 120,
								y: 40,
								properties: { direction: 'output' },
							},
						],
					},
					{
						id: 'mem_ctrl_inst',
						label: 'mem_ctrl_inst',
						type: 'instance',
						properties: { type: 'instance', moduleName: 'memory_controller' },
						width: 120,
						height: 80,
						x: 300,
						y: 80,
						ports: [
							{
								id: 'mem_clk',
								label: 'clk',
								x: 0,
								y: 20,
								properties: { direction: 'input' },
							},
							{
								id: 'mem_addr',
								label: 'addr',
								x: 0,
								y: 50,
								properties: { direction: 'input' },
							},
							{
								id: 'mem_data_out',
								label: 'data_out[31:0]',
								x: 120,
								y: 40,
								properties: { direction: 'output' },
							},
						],
					},
					{
						id: 'cache_ctrl_inst',
						label: 'cache_ctrl_inst',
						type: 'instance',
						properties: { type: 'instance', moduleName: 'cache_controller' },
						width: 120,
						height: 80,
						x: 520,
						y: 80,
						ports: [
							{
								id: 'cache_addr',
								label: 'addr',
								x: 0,
								y: 20,
								properties: { direction: 'input' },
							},
							{
								id: 'cache_hit',
								label: 'cache_hit',
								x: 120,
								y: 20,
								properties: { direction: 'output' },
							},
							{
								id: 'cache_data_out',
								label: 'data_out[31:0]',
								x: 120,
								y: 60,
								properties: { direction: 'output' },
							},
						],
					},
				],
			},
		],
		edges: [
			{
				id: 'edge_alu_to_mem',
				sources: ['alu_inst'],
				targets: ['mem_ctrl_inst'],
				label: 'alu_out[31:0]',
				width: 32,
				sections: [
					{
						startPoint: { x: 200, y: 120 },
						endPoint: { x: 300, y: 120 },
						bendPoints: [{ x: 250, y: 120 }],
					},
				],
			},
			{
				id: 'edge_mem_to_cache',
				sources: ['mem_ctrl_inst'],
				targets: ['cache_ctrl_inst'],
				label: 'mem_data[31:0]',
				width: 32,
				sections: [
					{
						startPoint: { x: 420, y: 120 },
						endPoint: { x: 520, y: 120 },
						bendPoints: [{ x: 470, y: 120 }],
					},
				],
			},
		],
	};
}

/**
 * Create a mixed module graph (contains both instances and logic blocks)
 */
function createMixedModuleGraph(): ElkGraph {
	return {
		id: 'mixed_graph',
		width: 800,
		height: 600,
		children: [
			{
				id: 'top_module',
				label: 'top_module',
				type: 'mixed_module',
				properties: { type: 'mixed_module' },
				width: 600,
				height: 400,
				x: 100,
				y: 100,
				children: [
					{
						id: 'sub_inst1',
						label: 'sub_inst1',
						type: 'instance',
						properties: { type: 'instance' },
						width: 100,
						height: 60,
						x: 50,
						y: 80,
					},
					{
						id: 'sub_inst2',
						label: 'sub_inst2',
						type: 'instance',
						properties: { type: 'instance' },
						width: 100,
						height: 60,
						x: 250,
						y: 80,
					},
				],
			},
		],
		edges: [],
	};
}

describe('D3Renderer - Hierarchical Rendering (T6)', () => {
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

	describe('Hierarchical Container Rendering', () => {
		it('should render hierarchical container with black border and no fill', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const parentBox = document.querySelector(
				`#${containerId} svg g.hierarchical-parent rect.hierarchical-parent-box`
			) as SVGRectElement;

			expect(parentBox).to.exist;
			expect(parentBox.getAttribute('fill')).to.equal('none');
			expect(parentBox.getAttribute('stroke')).to.equal('#000000');
			expect(parentBox.getAttribute('stroke-width')).to.equal('2');
		});

		it('should render parent module title', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const title = document.querySelector(
				`#${containerId} svg g.hierarchical-parent text.parent-title`
			) as SVGTextElement;

			expect(title).to.exist;
			expect(title.textContent).to.equal('processor');
		});

		it('should render title separator line', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const separator = document.querySelector(
				`#${containerId} svg g.hierarchical-parent line`
			) as SVGLineElement;

			expect(separator).to.exist;
		});
	});

	describe('Nested Instance Rendering', () => {
		it('should render child instance boxes with light fill', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const childBoxes = document.querySelectorAll(
				`#${containerId} svg g.hierarchical-child rect.child-instance-rect`
			);

			expect(childBoxes.length).to.equal(3); // alu, mem_ctrl, cache_ctrl
		});

		it('should fill child instance boxes with correct color', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const firstChild = document.querySelector(
				`#${containerId} svg g.hierarchical-child rect.child-instance-rect`
			) as SVGRectElement;

			expect(firstChild.getAttribute('fill')).to.equal('#f5f5dc');
		});

		it('should render instance labels', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const labels = document.querySelectorAll(
				`#${containerId} svg g.hierarchical-child text.instance-label`
			);

			expect(labels.length).to.equal(3);
			expect(labels[0].textContent).to.equal('alu_inst');
			expect(labels[1].textContent).to.equal('mem_ctrl_inst');
			expect(labels[2].textContent).to.equal('cache_ctrl_inst');
		});
	});

	describe('Parent Port Rendering', () => {
		it('should render parent ports on outer edge', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const parentPorts = document.querySelectorAll(
				`#${containerId} svg g.hierarchical-parent g.d3-port`
			);

			expect(parentPorts.length).to.equal(6); // clk, reset, addr, data_in, data_out, ready
		});

		it('should render port circles', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const portCircles = document.querySelectorAll(
				`#${containerId} svg g.hierarchical-parent circle.port-circle`
			);

			expect(portCircles.length).to.equal(6);
		});

		it('should render triangular port markers', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const portMarkers = document.querySelectorAll(
				`#${containerId} svg g.hierarchical-parent polygon.d3-port-marker`
			);

			expect(portMarkers.length).to.equal(6);
		});

		it('should color input ports green and output ports red', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const inputPort = document.querySelector(
				`#${containerId} svg g.port-input circle.port-circle`
			) as SVGCircleElement;

			const outputPort = document.querySelector(
				`#${containerId} svg g.port-output circle.port-circle`
			) as SVGCircleElement;

			expect(inputPort.getAttribute('fill')).to.equal('#4CAF50');  // Green
			expect(outputPort.getAttribute('fill')).to.equal('#F44336'); // Red
		});
	});

	describe('Instance Port Rendering', () => {
		it('should render ports on child instance boxes', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const instancePorts = document.querySelectorAll(
				`#${containerId} svg g.instance-port`
			);

			expect(instancePorts.length).to.be.greaterThan(0);
		});

		it('should render small port circles on instances', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const instancePortCircles = document.querySelectorAll(
				`#${containerId} svg circle.instance-port-circle`
			);

			expect(instancePortCircles.length).to.be.greaterThan(0);
		});
	});

	describe('Edge Routing and Rendering', () => {
		it('should render edges as black lines', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const edges = document.querySelectorAll(
				`#${containerId} svg path.edge-path`
			);

			expect(edges.length).to.equal(2); // alu_to_mem, mem_to_cache
		});

		it('should render edges with correct stroke color', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const edge = document.querySelector(
				`#${containerId} svg path.edge-path`
			) as SVGPathElement;

			expect(edge.getAttribute('stroke')).to.equal('#000000');
		});

		it('should render edge labels for signal names', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const labels = document.querySelectorAll(
				`#${containerId} svg text.edge-label`
			);

			expect(labels.length).to.equal(2);
			expect(labels[0].textContent).to.contain('alu_out');
			expect(labels[1].textContent).to.contain('mem_data');
		});

		it('should render edge paths with bend points from ELK', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const edge = document.querySelector(
				`#${containerId} svg path.edge-path`
			) as SVGPathElement;

			const pathData = edge.getAttribute('d');
			// Should have move, line, and possibly curve commands
			expect(pathData).to.exist;
			expect(pathData).to.include('M');
			expect(pathData).to.include('L');
		});
	});

	describe('Mixed Module Rendering', () => {
		it('should render mixed module with dashed border', () => {
			renderer.initialize(containerId);
			const graph = createMixedModuleGraph();
			renderer.render(graph);

			const mixedBox = document.querySelector(
				`#${containerId} svg g.mixed-module rect.mixed-module-box`
			) as SVGRectElement;

			expect(mixedBox).to.exist;
			expect(mixedBox.getAttribute('stroke-dasharray')).to.equal('5,5');
		});

		it('should render child instances in mixed module', () => {
			renderer.initialize(containerId);
			const graph = createMixedModuleGraph();
			renderer.render(graph);

			const childBoxes = document.querySelectorAll(
				`#${containerId} svg g.mixed-children g.instance-box`
			);

			expect(childBoxes.length).to.equal(2);
		});
	});

	describe('Hierarchical Nesting (3-4 levels deep)', () => {
		it('should render deeply nested hierarchies', () => {
			// Create a 3-level deep hierarchy
			const deepGraph: ElkGraph = {
				id: 'deep_graph',
				width: 800,
				height: 600,
				children: [
					{
						id: 'level1',
						label: 'level1',
						type: 'hierarchical_container',
						properties: { type: 'hierarchical_container' },
						width: 600,
						height: 500,
						x: 100,
						y: 50,
						children: [
							{
								id: 'level2',
								label: 'level2',
								type: 'hierarchical_container',
								properties: { type: 'hierarchical_container' },
								width: 400,
								height: 300,
								x: 100,
								y: 100,
								children: [
									{
										id: 'level3_inst',
										label: 'level3_inst',
										type: 'instance',
										properties: { type: 'instance' },
										width: 100,
										height: 60,
										x: 150,
										y: 150,
									},
								],
							},
						],
					},
				],
				edges: [],
			};

			renderer.initialize(containerId);
			renderer.render(deepGraph);

			const level1 = document.querySelector(`#${containerId} svg g.hierarchical-parent`);
			expect(level1).to.exist;
		});
	});

	describe('Integration: Complete Hierarchical Rendering', () => {
		it('should render processor example without errors', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();

			expect(() => renderer.render(graph)).to.not.throw();
		});

		it('should render all elements correctly in complete diagram', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			// Check parent container
			const parent = document.querySelector(
				`#${containerId} svg g.hierarchical-parent`
			);
			expect(parent).to.exist;

			// Check child instances
			const children = document.querySelectorAll(
				`#${containerId} svg g.hierarchical-child`
			);
			expect(children.length).to.equal(3);

			// Check ports
			const ports = document.querySelectorAll(
				`#${containerId} svg g.d3-port`
			);
			expect(ports.length).to.be.greaterThan(0);

			// Check edges
			const edges = document.querySelectorAll(
				`#${containerId} svg g.d3-edge`
			);
			expect(edges.length).to.equal(2);

			// Check labels
			const labels = document.querySelectorAll(
				`#${containerId} svg text.d3-label`
			);
			expect(labels.length).to.be.greaterThan(0);
		});

		it('should enable zoom and pan on hierarchical diagram', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			expect(() => renderer.enableZoom()).to.not.throw();
			expect(() => renderer.enablePan()).to.not.throw();
		});
	});

	describe('Node and Edge Retrieval', () => {
		it('should retrieve hierarchical container by ID', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const node = renderer.getNode('processor');
			expect(node).to.exist;
		});

		it('should retrieve child instance by ID', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const node = renderer.getNode('alu_inst');
			expect(node).to.exist;
		});

		it('should retrieve edges by ID', () => {
			renderer.initialize(containerId);
			const graph = createProcessorGraph();
			renderer.render(graph);

			const edge = renderer.getEdge('edge_alu_to_mem');
			expect(edge).to.exist;
		});
	});
});
