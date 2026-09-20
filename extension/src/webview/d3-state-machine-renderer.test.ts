/**
 * Tests for D3 State Machine Renderer (T7)
 *
 * Tests the rendering of finite state machines with:
 * - State circles (#f5f5dc fill, black border, radius 30)
 * - State names and values inside circles
 * - Directed arrows between states (transitions)
 * - Arrow labels with transition conditions
 * - Dashed box container around FSM
 * - Self-loops for state transitions
 * - Proper handling of multiple transitions from single state
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as d3 from 'd3';
import { D3StateMachineRenderer, FSMState, FSMTransition } from './d3-state-machine-renderer';

/**
 * Test suite for D3StateMachineRenderer
 */
describe('D3StateMachineRenderer (T7)', () => {
	let renderer: D3StateMachineRenderer;
	let container: HTMLElement;
	let svg: SVGSVGElement;
	let g: d3.Selection<SVGGElement, unknown, HTMLElement, any>;

	beforeEach(() => {
		// Create test container
		container = document.createElement('div');
		container.id = 'test-container';
		container.style.width = '800px';
		container.style.height = '600px';
		document.body.appendChild(container);

		// Create SVG
		svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', '800');
		svg.setAttribute('height', '600');
		container.appendChild(svg);

		// Create renderer and D3 selection
		renderer = new D3StateMachineRenderer();
		g = d3.select(svg).append('g').attr('class', 'd3-main-group');
	});

	afterEach(() => {
		if (container && container.parentElement) {
			document.body.removeChild(container);
		}
	});

	describe('State Circle Rendering', () => {
		it('should render state circle with #f5f5dc fill', () => {
			const state: FSMState = { name: 'IDLE', value: '0x0', x: 100, y: 100 };
			renderer['renderState'](g, state);

			const circle = svg.querySelector('circle.fsm-state-circle') as SVGCircleElement;
			expect(circle).to.exist;
			expect(circle.getAttribute('fill')).to.equal('#f5f5dc');
		});

		it('should render state circle with black border', () => {
			const state: FSMState = { name: 'IDLE', value: '0x0', x: 100, y: 100 };
			renderer['renderState'](g, state);

			const circle = svg.querySelector('circle.fsm-state-circle') as SVGCircleElement;
			expect(circle).to.exist;
			expect(circle.getAttribute('stroke')).to.equal('black');
			expect(circle.getAttribute('stroke-width')).to.equal('2');
		});

		it('should render state circle with radius 30', () => {
			const state: FSMState = { name: 'IDLE', value: '0x0', x: 100, y: 100 };
			renderer['renderState'](g, state);

			const circle = svg.querySelector('circle.fsm-state-circle') as SVGCircleElement;
			expect(circle).to.exist;
			expect(parseInt(circle.getAttribute('r') || '0')).to.equal(30);
		});

		it('should display state name inside circle', () => {
			const state: FSMState = { name: 'IDLE', value: '0x0', x: 100, y: 100 };
			renderer['renderState'](g, state);

			const nameText = svg.querySelector('text.fsm-state-name') as SVGTextElement;
			expect(nameText).to.exist;
			expect(nameText.textContent).to.equal('IDLE');
		});

		it('should display state value below name', () => {
			const state: FSMState = { name: 'IDLE', value: '0x0', x: 100, y: 100 };
			renderer['renderState'](g, state);

			const valueText = svg.querySelector('text.fsm-state-value') as SVGTextElement;
			expect(valueText).to.exist;
			expect(valueText.textContent).to.equal('0x0');
		});

		it('should handle missing state value gracefully', () => {
			const state: FSMState = { name: 'IDLE', x: 100, y: 100 }; // No value
			renderer['renderState'](g, state);

			const valueText = svg.querySelector('text.fsm-state-value');
			expect(valueText).to.not.exist; // Should not render if no value
		});
	});

	describe('Transition Arrow Rendering', () => {
		it('should render transition arrow between states', () => {
			const transition: FSMTransition = {
				from: 'IDLE',
				to: 'READ',
				condition: 'start',
				fromPos: { x: 100, y: 100 },
				toPos: { x: 200, y: 100 },
			};
			renderer['renderTransitionArrow'](g, transition.fromPos, transition.toPos, transition.condition);

			const line = svg.querySelector('line.fsm-transition-arrow') as SVGLineElement;
			expect(line).to.exist;
		});

		it('should render arrow with arrowhead marker', () => {
			const transition: FSMTransition = {
				from: 'IDLE',
				to: 'READ',
				condition: 'start',
				fromPos: { x: 100, y: 100 },
				toPos: { x: 200, y: 100 },
			};
			renderer['renderTransitionArrow'](g, transition.fromPos, transition.toPos, transition.condition);

			const line = svg.querySelector('line.fsm-transition-arrow') as SVGLineElement;
			expect(line).to.exist;
			expect(line.getAttribute('marker-end')).to.equal('url(#d3-arrow)');
		});

		it('should label transition arrow with condition', () => {
			const transition: FSMTransition = {
				from: 'IDLE',
				to: 'READ',
				condition: 'start',
				fromPos: { x: 100, y: 100 },
				toPos: { x: 200, y: 100 },
			};
			renderer['renderTransitionArrow'](g, transition.fromPos, transition.toPos, transition.condition);

			const label = svg.querySelector('text.fsm-transition-label') as SVGTextElement;
			expect(label).to.exist;
			expect(label.textContent).to.equal('start');
		});

		it('should position arrow endpoints on circle perimeter', () => {
			// Create states first to verify positioning
			const state1: FSMState = { name: 'IDLE', value: '0x0', x: 100, y: 100 };
			const state2: FSMState = { name: 'READ', value: '0x1', x: 200, y: 100 };
			renderer['renderState'](g, state1);
			renderer['renderState'](g, state2);

			const transition: FSMTransition = {
				from: 'IDLE',
				to: 'READ',
				condition: 'start',
				fromPos: { x: 100, y: 100 },
				toPos: { x: 200, y: 100 },
			};
			renderer['renderTransitionArrow'](g, transition.fromPos, transition.toPos, transition.condition);

			const line = svg.querySelector('line.fsm-transition-arrow') as SVGLineElement;
			const x1 = parseInt(line.getAttribute('x1') || '0');
			const x2 = parseInt(line.getAttribute('x2') || '0');

			// Arrow should not start/end exactly at circle center due to radius offset
			expect(x1).to.not.equal(100); // Should be offset from state1 center
			expect(x2).to.not.equal(200); // Should be offset from state2 center
		});
	});

	describe('Self-Loop Rendering', () => {
		it('should render self-loop as arc', () => {
			const position = { x: 100, y: 100 };
			renderer['renderSelfLoop'](g, position, 'reset');

			const path = svg.querySelector('path.fsm-self-loop-arrow') as SVGPathElement;
			expect(path).to.exist;
			expect(path.getAttribute('d')).to.include('A'); // SVG arc command
		});

		it('should label self-loop with condition', () => {
			const position = { x: 100, y: 100 };
			renderer['renderSelfLoop'](g, position, 'reset');

			const label = svg.querySelector('text.fsm-transition-label') as SVGTextElement;
			expect(label).to.exist;
			expect(label.textContent).to.equal('reset');
		});

		it('should position self-loop label above the arc', () => {
			const position = { x: 100, y: 100 };
			renderer['renderSelfLoop'](g, position, 'reset');

			const label = svg.querySelector('text.fsm-transition-label') as SVGTextElement;
			const y = parseInt(label.getAttribute('y') || '0');
			expect(y).to.be.lessThan(100 - 40); // Above center, accounting for arc
		});
	});

	describe('FSM Container', () => {
		it('should render dashed container box', () => {
			renderer['renderFSMContainer'](g, 400, 300, 'State Machine');

			const rect = svg.querySelector('rect.fsm-container-box') as SVGRectElement;
			expect(rect).to.exist;
			expect(rect.getAttribute('stroke-dasharray')).to.equal('5,5');
		});

		it('should render container with no fill', () => {
			renderer['renderFSMContainer'](g, 400, 300, 'State Machine');

			const rect = svg.querySelector('rect.fsm-container-box') as SVGRectElement;
			expect(rect).to.exist;
			expect(rect.getAttribute('fill')).to.equal('none');
		});

		it('should label container if label provided', () => {
			renderer['renderFSMContainer'](g, 400, 300, 'Traffic Light FSM');

			const label = svg.querySelector('text.fsm-container-label') as SVGTextElement;
			expect(label).to.exist;
			expect(label.textContent).to.equal('Traffic Light FSM');
		});

		it('should not render label if not provided', () => {
			renderer['renderFSMContainer'](g, 400, 300); // No label

			const label = svg.querySelector('text.fsm-container-label');
			expect(label).to.not.exist;
		});
	});

	describe('Complete FSM Rendering', () => {
		it('should render complete traffic light FSM', () => {
			const states: FSMState[] = [
				{ name: 'IDLE', value: '0x0', x: 100, y: 200 },
				{ name: 'READ', value: '0x1', x: 200, y: 200 },
				{ name: 'WRITE', value: '0x2', x: 300, y: 200 },
				{ name: 'DONE', value: '0x3', x: 400, y: 200 },
			];

			const transitions: FSMTransition[] = [
				{ from: 'IDLE', to: 'READ', condition: 'start', fromPos: states[0], toPos: states[1] },
				{ from: 'READ', to: 'WRITE', condition: 'data_valid', fromPos: states[1], toPos: states[2] },
				{ from: 'WRITE', to: 'DONE', condition: 'write_done', fromPos: states[2], toPos: states[3] },
				{ from: 'DONE', to: 'IDLE', condition: 'reset', fromPos: states[3], toPos: states[0] },
			];

			renderer.renderFSM(g, states, transitions, {
				x: 0,
				y: 0,
				width: 500,
				height: 400,
				label: 'State Machine',
			});

			// Verify container
			const container = svg.querySelector('rect.fsm-container-box');
			expect(container).to.exist;

			// Verify states
			const stateCircles = svg.querySelectorAll('circle.fsm-state-circle');
			expect(stateCircles.length).to.equal(4);

			// Verify transitions
			const arrows = svg.querySelectorAll('line.fsm-transition-arrow');
			expect(arrows.length).to.equal(4);
		});

		it('should handle multiple transitions from single state', () => {
			const states: FSMState[] = [
				{ name: 'IDLE', value: '0x0', x: 100, y: 200 },
				{ name: 'READ', value: '0x1', x: 200, y: 150 },
				{ name: 'ERROR', value: '0xFF', x: 200, y: 250 },
			];

			const transitions: FSMTransition[] = [
				{ from: 'IDLE', to: 'READ', condition: 'valid', fromPos: states[0], toPos: states[1] },
				{ from: 'IDLE', to: 'ERROR', condition: 'error', fromPos: states[0], toPos: states[2] },
			];

			renderer.renderFSM(g, states, transitions);

			const arrows = svg.querySelectorAll('line.fsm-transition-arrow');
			expect(arrows.length).to.equal(2); // Two transitions from IDLE
		});
	});

	describe('FSM Structure Extraction', () => {
		it('should extract states from node properties', () => {
			const node = {
				x: 0,
				y: 0,
				width: 400,
				height: 300,
				properties: {
					states: [
						{ name: 'IDLE' },
						{ name: 'READ' },
						{ name: 'WRITE' },
						{ name: 'DONE' },
					],
					stateValues: ['0x0', '0x1', '0x2', '0x3'],
					transitions: [
						{ from: 'IDLE', to: 'READ', condition: 'start' },
						{ from: 'READ', to: 'WRITE', condition: 'data_valid' },
						{ from: 'WRITE', to: 'DONE', condition: 'write_done' },
						{ from: 'DONE', to: 'IDLE', condition: 'reset' },
					],
				},
			};

			const { states, transitions } = renderer.extractFSMStructure(node);

			expect(states.length).to.equal(4);
			expect(states[0].name).to.equal('IDLE');
			expect(states[0].value).to.equal('0x0');
			expect(transitions.length).to.equal(4);
		});

		it('should provide default traffic light FSM if no properties', () => {
			const node = { x: 0, y: 0, width: 400, height: 300 };

			const { states, transitions } = renderer.extractFSMStructure(node);

			expect(states.length).to.equal(4);
			expect(states.map(s => s.name)).to.deep.equal(['IDLE', 'READ', 'WRITE', 'DONE']);
			expect(transitions.length).to.equal(4);
		});

		it('should extract self-loop information', () => {
			const node = {
				x: 0,
				y: 0,
				width: 400,
				height: 300,
				properties: {
					states: [{ name: 'WAIT' }],
					stateValues: ['0x0'],
					transitions: [
						{ from: 'WAIT', to: 'WAIT', condition: 'timeout_not_reached' },
					],
				},
			};

			const { transitions } = renderer.extractFSMStructure(node);

			expect(transitions.length).to.equal(1);
			expect(transitions[0].isSelfLoop).to.be.true;
		});
	});
});
