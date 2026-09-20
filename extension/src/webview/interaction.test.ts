/**
 * Tests for T9: Signal Path Tracing with Interactive Highlighting
 * Verifies hover/click behavior, signal path tracing, and metadata display
 */

import { DiagramInteraction } from './interaction';
import { Layout, LayoutNode, LayoutEdge } from './types/layout';
import { expect } from 'chai';

describe('T9: Signal Path Tracing', () => {
	let interaction: DiagramInteraction;
	let mockSvg: SVGElement;
	let mockLayout: Layout;

	beforeEach(() => {
		// Create mock SVG element
		mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		// Create test layout with multiple edges sharing same signal name
		mockLayout = {
			width: 800,
			height: 600,
			computedAt: Date.now(),
			nodes: [
				{ id: 'adder1', label: 'adder1', type: 'logic', x: 100, y: 100, width: 80, height: 60 },
				{ id: 'mul1', label: 'mul1', type: 'logic', x: 300, y: 100, width: 80, height: 60 },
				{ id: 'reg1', label: 'reg1', type: 'logic', x: 500, y: 100, width: 80, height: 60 },
				{ id: 'port_clk', label: 'clk', type: 'port', x: 50, y: 50, width: 20, height: 20 },
				{ id: 'port_out', label: 'out', type: 'port', x: 600, y: 50, width: 20, height: 20 },
			],
			edges: [
				{
					source: 'adder1',
					target: 'mul1',
					label: 'result[31:0]',
					type: 'signal',
					points: [[180, 130], [300, 130]],
				} as LayoutEdge,
				{
					source: 'mul1',
					target: 'reg1',
					label: 'result[31:0]',
					type: 'signal',
					points: [[380, 130], [500, 130]],
				} as LayoutEdge,
				{
					source: 'reg1',
					target: 'port_out',
					label: 'result[31:0]',
					type: 'signal',
					points: [[580, 130], [600, 60]],
				} as LayoutEdge,
				{
					source: 'port_clk',
					target: 'adder1',
					label: 'clk',
					type: 'clock',
					points: [[60, 60], [100, 100]],
				} as LayoutEdge,
			],
		};

		// Create mock SVG elements for edges
		const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		edgesGroup.classList.add('edges');
		mockSvg.appendChild(edgesGroup);

		// Create edge elements
		mockLayout.edges.forEach((edge) => {
			const edgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			edgeG.classList.add('edge', `edge-type-${edge.type || 'signal'}`);
			edgeG.setAttribute('data-source', edge.source);
			edgeG.setAttribute('data-target', edge.target);
			edgeG.setAttribute('data-id', `${edge.source}_${edge.target}`);
			if (edge.label) {
				edgeG.setAttribute('data-signal-name', edge.label);
			}

			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.classList.add('edge-path');
			edgeG.appendChild(path);

			if (edge.label) {
				const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
				label.classList.add('edge-label');
				label.textContent = edge.label;
				edgeG.appendChild(label);
			}

			edgesGroup.appendChild(edgeG);
		});

		// Create mock nodes
		const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		nodesGroup.classList.add('nodes');
		mockSvg.appendChild(nodesGroup);

		mockLayout.nodes.forEach((node) => {
			const nodeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			nodeG.classList.add('node', `node-type-${node.type}`);
			nodeG.setAttribute('data-id', node.id);
			nodesGroup.appendChild(nodeG);
		});

		// Add SVG to document
		document.body.appendChild(mockSvg);

		// Create interaction handler
		interaction = new DiagramInteraction();
	});

	afterEach(() => {
		// Cleanup
		document.body.removeChild(mockSvg);
	});

	it('T9.1: Should build signal path cache on setup', () => {
		interaction.setupSignalHandlers(mockSvg, mockLayout);

		// Verify that handler was set up successfully
		const state = interaction.getHighlightState();
		expect(state.highlightedSignals.size).to.equal(0);
	});

	it('T9.2: Should highlight all edges with same signal name', () => {
		interaction.setupSignalHandlers(mockSvg, mockLayout);

		// Simulate clicking on first "result[31:0]" edge
		const edges = mockSvg.querySelectorAll('.edge');
		expect(edges.length).to.be.greaterThan(0);

		// Click first result edge (adder1 -> mul1)
		const firstEdge = edges[0] as SVGGElement;
		const clickEvent = new MouseEvent('click', { bubbles: true });
		firstEdge.dispatchEvent(clickEvent);

		// Check that all three result edges are highlighted
		const highlightedEdges = mockSvg.querySelectorAll('.edge.signal-path-highlighted');
		expect(highlightedEdges.length).to.equal(3, 'Should highlight all 3 result edges');
	});

	it('T9.3: Should dim non-selected edges', () => {
		interaction.setupSignalHandlers(mockSvg, mockLayout);

		const edges = mockSvg.querySelectorAll('.edge');
		const firstEdge = edges[0] as SVGGElement;
		const clickEvent = new MouseEvent('click', { bubbles: true });
		firstEdge.dispatchEvent(clickEvent);

		// Check that clock edge is dimmed
		const dimmedEdges = mockSvg.querySelectorAll('.edge.signal-path-dimmed');
		expect(dimmedEdges.length).to.be.greaterThan(0, 'Should have dimmed edges');
	});

	it('T9.4: Should persist selection on click', () => {
		interaction.setupSignalHandlers(mockSvg, mockLayout);

		const edges = mockSvg.querySelectorAll('.edge');
		const firstEdge = edges[0] as SVGGElement;
		const clickEvent = new MouseEvent('click', { bubbles: true });
		firstEdge.dispatchEvent(clickEvent);

		const state = interaction.getHighlightState();
		expect(state.selectedSignal).to.not.be.null;
		expect(state.selectedSignalMetadata).to.not.be.null;
	});

	it('T9.5: Should deselect on clicking same edge twice', () => {
		interaction.setupSignalHandlers(mockSvg, mockLayout);

		const edges = mockSvg.querySelectorAll('.edge');
		const firstEdge = edges[0] as SVGGElement;
		const clickEvent = new MouseEvent('click', { bubbles: true });

		// First click: select
		firstEdge.dispatchEvent(clickEvent);
		let state = interaction.getHighlightState();
		expect(state.selectedSignal).to.not.be.null;

		// Second click: deselect
		firstEdge.dispatchEvent(clickEvent);
		state = interaction.getHighlightState();
		expect(state.selectedSignal).to.be.null;
	});

	it('T9.6: Should extract signal metadata', () => {
		interaction.setupSignalHandlers(mockSvg, mockLayout);

		const edges = mockSvg.querySelectorAll('.edge');
		const firstEdge = edges[0] as SVGGElement;
		const clickEvent = new MouseEvent('click', { bubbles: true });
		firstEdge.dispatchEvent(clickEvent);

		const state = interaction.getHighlightState();
		expect(state.selectedSignalMetadata).to.not.be.null;
		expect(state.selectedSignalMetadata?.signalName).to.include('result');
		expect(state.selectedSignalMetadata?.edgeCount).to.equal(3);
	});

	it('T9.7: Should parse signal width from label', () => {
		interaction.setupSignalHandlers(mockSvg, mockLayout);

		const edges = mockSvg.querySelectorAll('.edge');
		const firstEdge = edges[0] as SVGGElement;
		const clickEvent = new MouseEvent('click', { bubbles: true });
		firstEdge.dispatchEvent(clickEvent);

		const state = interaction.getHighlightState();
		expect(state.selectedSignalMetadata?.width).to.equal(32, 'Should parse [31:0] as 32 bits');
	});

	it('T9.8: Should highlight endpoint nodes', () => {
		interaction.setupSignalHandlers(mockSvg, mockLayout);

		const edges = mockSvg.querySelectorAll('.edge');
		const firstEdge = edges[0] as SVGGElement;
		const clickEvent = new MouseEvent('click', { bubbles: true });
		firstEdge.dispatchEvent(clickEvent);

		// Check that source and target nodes are highlighted
		const highlightedNodes = mockSvg.querySelectorAll('.node.signal-endpoint-highlighted');
		expect(highlightedNodes.length).to.be.greaterThan(0);
	});

	it('T9.9: Should distinguish signal types', () => {
		interaction.setupSignalHandlers(mockSvg, mockLayout);

		const edges = mockSvg.querySelectorAll('.edge');

		// Find clock edge
		let clockEdge: Element | null = null;
		edges.forEach((edge) => {
			if (edge.getAttribute('data-signal-name') === 'clk') {
				clockEdge = edge;
			}
		});

		expect(clockEdge).to.not.be.null;

		if (clockEdge) {
			const clickEvent = new MouseEvent('click', { bubbles: true });
			(clockEdge as SVGGElement).dispatchEvent(clickEvent);

			const state = interaction.getHighlightState();
			expect(state.selectedSignalMetadata?.type).to.equal('clock');
		}
	});

	it('T9.10: Should support multiple signal names in same layout', () => {
		interaction.setupSignalHandlers(mockSvg, mockLayout);

		const edges = mockSvg.querySelectorAll('.edge');
		expect(edges.length).to.equal(4);

		// Click on first result edge
		const firstEdge = edges[0] as SVGGElement;
		const clickEvent = new MouseEvent('click', { bubbles: true });
		firstEdge.dispatchEvent(clickEvent);

		let state = interaction.getHighlightState();
		expect(state.selectedSignalMetadata?.signalName).to.include('result');

		// Click on clock edge
		const clockEdge = edges[3] as SVGGElement;
		clockEdge.dispatchEvent(clickEvent);

		state = interaction.getHighlightState();
		expect(state.selectedSignalMetadata?.signalName).to.equal('clk');
	});
});
