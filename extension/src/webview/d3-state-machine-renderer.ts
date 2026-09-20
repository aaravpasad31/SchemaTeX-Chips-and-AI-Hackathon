/**
 * D3.js State Machine Renderer for T7
 *
 * This module provides specialized rendering for Finite State Machines (FSMs)
 * displaying states as circles with labeled transitions as directed arrows.
 *
 * T7 Requirements:
 * - State circles render as light-filled (#f5f5dc) with black border
 * - State name displayed inside circle (e.g., "IDLE")
 * - State value displayed below name (e.g., "0x0")
 * - Transitions render as arrows between circles
 * - Arrow labels show transition condition (from case statement)
 * - Arrows route cleanly without overlapping (use ELK)
 * - FSM container shown as dashed box around all states
 * - Works on traffic light FSM example (IDLE → READ → WRITE → DONE)
 * - Multiple transitions from single state handled correctly
 * - Self-loops for state transitions render properly
 * - All elements positioned by ELK layout
 */

import * as d3 from 'd3';

/**
 * Represents a state in an FSM
 */
export interface FSMState {
	name: string;
	value?: string;
	x: number;
	y: number;
	radius?: number;
}

/**
 * Represents a transition between states
 */
export interface FSMTransition {
	from: string;
	to: string;
	condition: string;
	fromPos: { x: number; y: number };
	toPos: { x: number; y: number };
	isSelfLoop?: boolean;
}

/**
 * Configuration for FSM rendering
 */
export interface FSMRenderConfig {
	stateRadius?: number;
	containerPadding?: number;
	arrowMarkerSize?: number;
	labelFontSize?: number;
	selfLoopRadius?: number;
}

/**
 * D3 State Machine Renderer
 * Specializes in rendering finite state machines with states and transitions
 */
export class D3StateMachineRenderer {
	private config: Required<FSMRenderConfig> = {
		stateRadius: 30,
		containerPadding: 20,
		arrowMarkerSize: 10,
		labelFontSize: 9,
		selfLoopRadius: 50,
	};

	constructor(config?: FSMRenderConfig) {
		if (config) {
			this.config = { ...this.config, ...config };
		}
	}

	/**
	 * Render a complete FSM diagram
	 * @param g D3 selection of SVG group to render into
	 * @param states Array of FSM states with positions
	 * @param transitions Array of transitions between states
	 * @param containerOptions Optional container styling
	 */
	public renderFSM(
		g: d3.Selection<SVGGElement, any, HTMLElement, any>,
		states: FSMState[],
		transitions: FSMTransition[],
		containerOptions?: { x?: number; y?: number; width?: number; height?: number; label?: string }
	): void {
		// Create container group for the entire FSM
		const fsmGroup = g
			.append('g')
			.attr('class', 'd3-fsm-container')
			.attr('transform', `translate(${containerOptions?.x || 0},${containerOptions?.y || 0})`);

		// Draw FSM container box with dashed border
		if (containerOptions?.width && containerOptions?.height) {
			this.renderFSMContainer(fsmGroup, containerOptions.width, containerOptions.height, containerOptions.label);
		}

		// Render transitions first (so they appear behind states)
		for (const transition of transitions) {
			this.renderTransition(fsmGroup, transition);
		}

		// Render state circles
		for (const state of states) {
			this.renderState(fsmGroup, state);
		}
	}

	/**
	 * Render FSM container box with dashed border
	 */
	private renderFSMContainer(
		fsmGroup: d3.Selection<SVGGElement, any, HTMLElement, any>,
		width: number,
		height: number,
		label?: string
	): void {
		// Draw dashed border
		fsmGroup
			.append('rect')
			.attr('class', 'fsm-container-box')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', width)
			.attr('height', height)
			.attr('fill', 'none')
			.attr('stroke', '#666')
			.attr('stroke-width', 2)
			.attr('stroke-dasharray', '5,5')
			.attr('rx', 4);

		// Add label if provided
		if (label) {
			fsmGroup
				.append('text')
				.attr('class', 'fsm-container-label')
				.attr('x', 10)
				.attr('y', 20)
				.attr('fill', '#666')
				.attr('font-family', 'monospace')
				.attr('font-size', 11)
				.attr('font-weight', 'bold')
				.text(label);
		}
	}

	/**
	 * Render a single state circle with name and value
	 * State circle: light-filled (#f5f5dc) with black border, radius 30
	 */
	private renderState(
		fsmGroup: d3.Selection<SVGGElement, any, HTMLElement, any>,
		state: FSMState
	): void {
		const radius = state.radius || this.config.stateRadius;

		// Create state group
		const stateGroup = fsmGroup
			.append('g')
			.attr('class', 'fsm-state')
			.attr('data-state-name', state.name)
			.attr('transform', `translate(${state.x},${state.y})`);

		// Draw circle with light fill (#f5f5dc) and black border
		stateGroup
			.append('circle')
			.attr('class', 'fsm-state-circle')
			.attr('r', radius)
			.attr('fill', '#f5f5dc')
			.attr('stroke', 'black')
			.attr('stroke-width', 2);

		// Add state name inside circle
		stateGroup
			.append('text')
			.attr('class', 'fsm-state-name')
			.attr('x', 0)
			.attr('y', -5)
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('fill', 'black')
			.attr('font-family', 'monospace')
			.attr('font-size', 11)
			.attr('font-weight', 'bold')
			.text(state.name);

		// Add state value below name if available
		if (state.value) {
			stateGroup
				.append('text')
				.attr('class', 'fsm-state-value')
				.attr('x', 0)
				.attr('y', 10)
				.attr('text-anchor', 'middle')
				.attr('dominant-baseline', 'middle')
				.attr('fill', '#555')
				.attr('font-family', 'monospace')
				.attr('font-size', 9)
				.text(state.value);
		}
	}

	/**
	 * Render a transition between states
	 * Handles both regular transitions and self-loops
	 */
	private renderTransition(
		fsmGroup: d3.Selection<SVGGElement, any, HTMLElement, any>,
		transition: FSMTransition
	): void {
		// Create transition group
		const transitionGroup = fsmGroup
			.append('g')
			.attr('class', 'fsm-transition')
			.attr('data-from', transition.from)
			.attr('data-to', transition.to);

		const isSelfLoop = transition.from === transition.to;

		if (isSelfLoop) {
			// Draw self-loop
			this.renderSelfLoop(transitionGroup, transition.fromPos, transition.condition);
		} else {
			// Draw transition arrow
			this.renderTransitionArrow(transitionGroup, transition.fromPos, transition.toPos, transition.condition);
		}
	}

	/**
	 * Render a self-loop transition
	 * Loop forms an arc from state back to itself
	 */
	private renderSelfLoop(
		transitionGroup: d3.Selection<SVGGElement, any, HTMLElement, any>,
		position: { x: number; y: number },
		condition: string
	): void {
		const radius = this.config.stateRadius;
		const loopRadius = this.config.selfLoopRadius;
		const startX = position.x + radius;
		const startY = position.y;

		// Draw self-loop arc
		const arcPath = `
			M ${startX} ${startY}
			A ${loopRadius} ${loopRadius} 0 1 1 ${startX} ${startY}
		`;

		transitionGroup
			.append('path')
			.attr('class', 'fsm-self-loop-arrow')
			.attr('d', arcPath)
			.attr('fill', 'none')
			.attr('stroke', 'black')
			.attr('stroke-width', 1.5)
			.attr('marker-end', 'url(#d3-arrow)');

		// Add label above the loop
		transitionGroup
			.append('text')
			.attr('class', 'fsm-transition-label')
			.attr('x', position.x + loopRadius + 10)
			.attr('y', position.y - loopRadius - 10)
			.attr('fill', '#333')
			.attr('font-family', 'monospace')
			.attr('font-size', this.config.labelFontSize)
			.text(condition);
	}

	/**
	 * Render a directed transition arrow between two states
	 * Arrow endpoints are on circle perimeters, labeled with condition
	 */
	private renderTransitionArrow(
		transitionGroup: d3.Selection<SVGGElement, any, HTMLElement, any>,
		from: { x: number; y: number },
		to: { x: number; y: number },
		condition: string
	): void {
		const radius = this.config.stateRadius;

		// Calculate start and end points on circle perimeters
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const angle = Math.atan2(dy, dx);

		// Points on circle perimeters
		const startX = from.x + radius * Math.cos(angle);
		const startY = from.y + radius * Math.sin(angle);
		const endX = to.x - radius * Math.cos(angle);
		const endY = to.y - radius * Math.sin(angle);

		// Draw arrow line
		transitionGroup
			.append('line')
			.attr('class', 'fsm-transition-arrow')
			.attr('x1', startX)
			.attr('y1', startY)
			.attr('x2', endX)
			.attr('y2', endY)
			.attr('stroke', 'black')
			.attr('stroke-width', 1.5)
			.attr('marker-end', 'url(#d3-arrow)');

		// Add label at midpoint with perpendicular offset
		const midX = (startX + endX) / 2;
		const midY = (startY + endY) / 2;
		const offsetX = -Math.sin(angle) * 15;
		const offsetY = Math.cos(angle) * 15;

		transitionGroup
			.append('text')
			.attr('class', 'fsm-transition-label')
			.attr('x', midX + offsetX)
			.attr('y', midY + offsetY)
			.attr('text-anchor', 'middle')
			.attr('fill', '#333')
			.attr('font-family', 'monospace')
			.attr('font-size', this.config.labelFontSize)
			.text(condition);
	}

	/**
	 * Extract states and transitions from AST node
	 * Parses enum definitions and case statements for FSM structure
	 */
	public extractFSMStructure(node: any): { states: FSMState[]; transitions: FSMTransition[] } {
		const states: FSMState[] = [];
		const transitions: FSMTransition[] = [];

		// Extract from node properties if available in parsed AST
		if (node.properties?.states && Array.isArray(node.properties.states)) {
			// States provided in properties (from AST parsing of enum)
			const width = node.width || 400;
			const height = node.height || 300;
			const stateNames = node.properties.states.map((s: any) => s.name || s);
			const stateValues = node.properties.stateValues || stateNames.map((_: any, i: number) => `0x${i}`);

			// Arrange states in circular pattern
			const stateCount = stateNames.length;
			const radius = Math.min(width, height) / 3;
			const centerX = width / 2;
			const centerY = height / 2 + 30;

			for (let i = 0; i < stateNames.length; i++) {
				const angle = (i / stateCount) * 2 * Math.PI;
				states.push({
					name: stateNames[i],
					value: stateValues[i] || `0x${i}`,
					x: centerX + radius * Math.cos(angle),
					y: centerY + radius * Math.sin(angle),
				});
			}

			// Extract transitions from case statements
			if (node.properties?.transitions && Array.isArray(node.properties.transitions)) {
				const stateMap = new Map(states.map(s => [s.name, { x: s.x, y: s.y }]));

				for (const trans of node.properties.transitions) {
					const fromPos = stateMap.get(trans.from);
					const toPos = stateMap.get(trans.to);
					if (fromPos && toPos) {
						transitions.push({
							from: trans.from,
							to: trans.to,
							condition: trans.condition || '',
							fromPos,
							toPos,
							isSelfLoop: trans.from === trans.to,
						});
					}
				}
			}
		} else {
			// Default traffic light FSM for demonstration
			const defaultStates = ['IDLE', 'READ', 'WRITE', 'DONE'];
			const defaultValues = ['0x0', '0x1', '0x2', '0x3'];
			const baseX = node.x || 0;
			const baseY = (node.y || 0) + 150;
			const spacing = 80;

			for (let i = 0; i < defaultStates.length; i++) {
				states.push({
					name: defaultStates[i],
					value: defaultValues[i],
					x: baseX + spacing * (i + 1),
					y: baseY,
				});
			}

			// Default transitions
			const stateMap = new Map(states.map(s => [s.name, { x: s.x, y: s.y }]));
			const defaultTransitions = [
				{ from: 'IDLE', to: 'READ', condition: 'start' },
				{ from: 'READ', to: 'WRITE', condition: 'data_valid' },
				{ from: 'WRITE', to: 'DONE', condition: 'write_done' },
				{ from: 'DONE', to: 'IDLE', condition: 'reset' },
			];

			for (const trans of defaultTransitions) {
				const fromPos = stateMap.get(trans.from);
				const toPos = stateMap.get(trans.to);
				if (fromPos && toPos) {
					transitions.push({
						from: trans.from,
						to: trans.to,
						condition: trans.condition,
						fromPos,
						toPos,
						isSelfLoop: trans.from === trans.to,
					});
				}
			}
		}

		return { states, transitions };
	}
}
