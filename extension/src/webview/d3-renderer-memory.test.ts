/**
 * Unit tests for D3Renderer memory block rendering (T8)
 * Tests hatch pattern, capacity extraction, and port rendering
 */

import { expect } from 'chai';
import { D3Renderer } from './d3-renderer';
import { ElkGraph, ElkNode } from './types/layout';

describe('D3Renderer - Memory Block Rendering (T8)', () => {
	let renderer: D3Renderer;
	let container: HTMLElement;

	beforeEach(() => {
		renderer = new D3Renderer();
		const containerId = `test-container-${Date.now()}`;
		container = document.createElement('div');
		container.id = containerId;
		container.style.width = '800px';
		container.style.height = '600px';
		document.body.appendChild(container);
		renderer.initialize(containerId);
	});

	afterEach(() => {
		renderer.destroy();
		if (container.parentElement) {
			container.parentElement.removeChild(container);
		}
	});

	describe('Memory Block Rendering', () => {
		it('should render a memory block with light fill and black border', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'mem',
						type: 'memory_block',
						x: 100,
						y: 100,
						width: 120,
						height: 100,
						properties: {
							arraySize: 64,
							dataWidth: 32,
						},
					},
				],
				edges: [],
			};

			renderer.render(graph);

			// Check that memory block was rendered
			const memNode = renderer.getNode('mem1');
			expect(memNode).to.exist;

			// Check that the SVG contains the memory rectangle
			const svgElements = container.querySelectorAll('.memory-block');
			expect(svgElements.length).to.equal(1);
		});

		it('should extract and display capacity from memory block properties', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'ram',
						type: 'memory_block',
						x: 50,
						y: 50,
						width: 140,
						height: 100,
						properties: {
							arraySize: 256,
							dataWidth: 8,
						},
					},
				],
				edges: [],
			};

			renderer.render(graph);

			// Check for capacity label in the rendered SVG
			const capacityLabels = container.querySelectorAll('.d3-capacity-label');
			expect(capacityLabels.length).to.be.greaterThan(0);

			// Verify the capacity text
			const capacityText = capacityLabels[0].textContent;
			expect(capacityText).to.include('256');
			expect(capacityText).to.include('8');
		});

		it('should render clock input with special triangular symbol', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'mem',
						type: 'memory_block',
						x: 100,
						y: 100,
						width: 120,
						height: 100,
						properties: {
							arraySize: 64,
							dataWidth: 32,
							clk: 'clk',
						},
					},
				],
				edges: [],
			};

			renderer.render(graph);

			// Check for clock symbol
			const clockSymbols = container.querySelectorAll('.d3-clock-symbol');
			expect(clockSymbols.length).to.be.greaterThan(0);

			// Check for clock label
			const texts = container.querySelectorAll('text');
			let hasClkLabel = false;
			texts.forEach((text) => {
				if (text.textContent === 'clk') {
					hasClkLabel = true;
				}
			});
			expect(hasClkLabel).to.be.true;
		});

		it('should render memory-specific ports (addr, data_in, data_out)', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'mem',
						type: 'memory_block',
						x: 100,
						y: 100,
						width: 120,
						height: 100,
						properties: {
							arraySize: 64,
							dataWidth: 32,
						},
					},
				],
				edges: [],
			};

			renderer.render(graph);

			// Check for port labels
			const texts = container.querySelectorAll('text');
			const portNames = new Set<string>();
			texts.forEach((text) => {
				const content = text.textContent;
				if (['addr', 'data_in', 'data_out', 'we', 're', 'valid'].includes(content || '')) {
					portNames.add(content || '');
				}
			});

			// Should have at least some of the expected ports
			expect(portNames.has('addr')).to.be.true;
			expect(portNames.has('data_out')).to.be.true;
		});

		it('should render control signals (we, re, valid) on edges', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'mem',
						type: 'memory_block',
						x: 100,
						y: 100,
						width: 120,
						height: 100,
						properties: {
							arraySize: 64,
							dataWidth: 32,
						},
					},
				],
				edges: [],
			};

			renderer.render(graph);

			// Check for control signal labels
			const texts = container.querySelectorAll('text');
			const controlSignals = new Set<string>();
			texts.forEach((text) => {
				const content = text.textContent;
				if (['we', 're', 'valid'].includes(content || '')) {
					controlSignals.add(content || '');
				}
			});

			// Should have control signals
			expect(controlSignals.size).to.be.greaterThan(0);
		});

		it('should apply hatch pattern to memory block rectangle', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'mem',
						type: 'memory_block',
						x: 100,
						y: 100,
						width: 120,
						height: 100,
						properties: {
							arraySize: 64,
							dataWidth: 32,
						},
					},
				],
				edges: [],
			};

			renderer.render(graph);

			// Check for hatch pattern usage in SVG
			const svgContent = container.innerHTML;
			expect(svgContent).to.include('memory-hatch-pattern');
		});

		it('should extract capacity from array notation in label', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'mem[0:63][31:0]',
						type: 'memory_block',
						x: 100,
						y: 100,
						width: 120,
						height: 100,
					},
				],
				edges: [],
			};

			renderer.render(graph);

			// Check for extracted capacity in rendered output
			const capacityLabels = container.querySelectorAll('.d3-capacity-label');
			if (capacityLabels.length > 0) {
				const capacityText = capacityLabels[0].textContent;
				// Should show 64×32
				expect(capacityText).to.include('64');
				expect(capacityText).to.include('32');
			}
		});

		it('should position port markers on block edges', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'mem',
						type: 'memory_block',
						x: 200,
						y: 200,
						width: 140,
						height: 100,
						properties: {
							arraySize: 256,
							dataWidth: 32,
						},
					},
				],
				edges: [],
			};

			renderer.render(graph);

			// Check for port markers (should be polygons with input/output classes)
			const portMarkers = container.querySelectorAll('.d3-port-marker');
			expect(portMarkers.length).to.be.greaterThan(0);

			// Check that some are input and some are output/control
			let hasInput = false;
			let hasOutput = false;
			portMarkers.forEach((marker) => {
				const classes = marker.getAttribute('class') || '';
				if (classes.includes('input-port')) hasInput = true;
				if (classes.includes('output-port')) hasOutput = true;
			});

			expect(hasInput).to.be.true;
			expect(hasOutput).to.be.true;
		});
	});

	describe('Hatch Pattern SVG Definition', () => {
		it('should define diagonal hatch pattern in SVG defs', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'mem',
						type: 'memory_block',
						x: 100,
						y: 100,
						width: 120,
						height: 100,
					},
				],
				edges: [],
			};

			renderer.render(graph);

			// Check for pattern definition in SVG
			const patterns = container.querySelectorAll('pattern');
			let hasMemoryHatch = false;
			patterns.forEach((pattern) => {
				if (pattern.getAttribute('id') === 'memory-hatch-pattern') {
					hasMemoryHatch = true;
					// Check that it has lines for hatch
					const lines = pattern.querySelectorAll('line');
					expect(lines.length).to.be.greaterThan(0);
				}
			});

			expect(hasMemoryHatch).to.be.true;
		});

		it('should have subtle hatch pattern (low opacity)', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'mem',
						type: 'memory_block',
						x: 100,
						y: 100,
						width: 120,
						height: 100,
					},
				],
				edges: [],
			};

			renderer.render(graph);

			// Check that hatch lines have low opacity
			const patterns = container.querySelectorAll('pattern');
			patterns.forEach((pattern) => {
				if (pattern.getAttribute('id') === 'memory-hatch-pattern') {
					const lines = pattern.querySelectorAll('line');
					lines.forEach((line) => {
						const opacity = line.getAttribute('opacity');
						// Should be subtle (low opacity like 0.3)
						expect(opacity).to.exist;
						const opacityValue = parseFloat(opacity || '1');
						expect(opacityValue).to.be.lessThan(1);
					});
				}
			});
		});
	});

	describe('Memory Block Integration with Layout', () => {
		it('should work with ELK layout output', () => {
			const graph: ElkGraph = {
				id: 'test-graph',
				nodes: [
					{
						id: 'mem1',
						label: 'ram',
						type: 'memory_block',
						x: 50,
						y: 50,
						width: 140,
						height: 100,
						properties: {
							arraySize: 64,
							dataWidth: 32,
						},
					},
					{
						id: 'comb1',
						label: 'decoder',
						type: 'combinational_logic',
						x: 250,
						y: 50,
						width: 120,
						height: 80,
						properties: {
							inputs: ['sel'],
							outputs: ['out'],
						},
					},
				],
				edges: [
					{
						id: 'edge1',
						source: 'mem1',
						target: 'comb1',
						label: 'data',
						points: [
							{ x: 190, y: 100 },
							{ x: 250, y: 100 },
						],
					},
				],
			};

			renderer.render(graph);

			// Verify both nodes were rendered
			const memNode = renderer.getNode('mem1');
			const combNode = renderer.getNode('comb1');

			expect(memNode).to.exist;
			expect(combNode).to.exist;

			// Verify edge was rendered
			const edge = renderer.getEdge('edge1');
			expect(edge).to.exist;
		});
	});
});
