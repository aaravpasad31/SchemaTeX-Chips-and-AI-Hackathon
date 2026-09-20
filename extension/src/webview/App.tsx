import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { VsCodeApi } from './vscode-api';
import { LayoutEngine } from './layout-engine';
import { Layout, LayoutNode, LayoutEdge } from './types/layout';
import { ParserOutput, ParserError } from '../types/ast';
import { DiagramCanvas } from './diagram-canvas';
import { ErrorDisplay } from './error-display';
import { HierarchyManager } from './hierarchy';

interface DiagramData extends ParserOutput {
	// ParserOutput includes module and metadata
}

interface Example {
	filename: string;
	name: string;
	description: string;
}

const EXAMPLES: Example[] = [
	{ filename: '1-hierarchical-basic.sv', name: 'Hierarchical', description: 'Nested module hierarchy' },
	{ filename: '2-combinational-basic.sv', name: 'Combinational', description: 'Pure combinational logic' },
	{ filename: '3-sequential-basic.sv', name: 'Sequential', description: 'Sequential logic with state' },
	{ filename: '4-state-machine-basic.sv', name: 'State Machine', description: 'FSM with state transitions' },
	{ filename: '5-memory-basic.sv', name: 'Memory', description: 'Memory block with RAM/ROM' },
	{ filename: '6-mixed-basic.sv', name: 'Mixed', description: 'Combined logic and hierarchy' },
	{ filename: 'counter_4bit.sv', name: '4-bit Counter', description: 'Simple binary counter' },
	{ filename: 'processor.sv', name: 'Processor', description: 'Complete processor example' },
];

/**
 * Root React component for the SchemaTeX diagram viewer.
 * Receives diagram data via VS Code message passing API.
 * Integrates ELK layout engine (#8) to compute node positions.
 * Renders SVG diagrams from layout data (#9)
 */
export function App() {
	const [diagramData, setDiagramData] = useState<DiagramData | null>(null);
	const [layout, setLayout] = useState<Layout | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [errors, setErrors] = useState<ParserError[]>([]);
	const [selectedNode, setSelectedNode] = useState<string | null>(null);
	const [hoveredNode, setHoveredNode] = useState<string | null>(null);
	const [showErrorPanel, setShowErrorPanel] = useState(true);
	const [collapsedModules, setCollapsedModules] = useState<Map<string, boolean>>(new Map());
	const [selectedExample, setSelectedExample] = useState<string>('1-hierarchical-basic.sv');
	const [layoutEngine] = useState(() => new LayoutEngine());
	const canvasRef = useRef<HTMLDivElement>(null);
	const errorPanelRef = useRef<HTMLDivElement>(null);
	const errorDisplayRef = useRef<ErrorDisplay | null>(null);
	const diagramCanvasRef = useRef<DiagramCanvas | null>(null);

	useEffect(() => {
		const api = VsCodeApi.getInstance();

		// Handle diagram data messages from extension (with pre-computed layout)
		api.onMessage('diagram-data-with-layout', (payload: { ast: DiagramData; layout: Layout }) => {
			console.log('Received diagram data with layout:', payload);
			setDiagramData(payload.ast);
			setLayout(payload.layout);
			setError(null);

			// Extract and display errors
			const parserErrors = payload.ast.errors || [];
			setErrors(parserErrors);
			if (errorDisplayRef.current && errorPanelRef.current) {
				errorDisplayRef.current.showErrors(parserErrors);
			}

			setLoading(false);
			console.log('Layout received directly from extension');
		});

		// Handle diagram data messages from extension (legacy: AST only, layout computed locally)
		api.onMessage('diagram-data', async (payload: DiagramData) => {
			console.log('Received diagram data (computing layout locally):', payload);
			setDiagramData(payload);
			setLoading(true);
			setError(null);

			try {
				// Compute layout using ELK engine
				const layoutData = await layoutEngine.computeLayout(payload);
				setLayout(layoutData);
				console.log('Layout computed successfully:', layoutData);
				setLoading(false);
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				console.error('Error computing layout:', err);
				setError(`Failed to compute layout: ${errorMsg}`);
				setLoading(false);
			}
		});

		// Handle status messages from extension
		api.onMessage('status', (payload: { status: string; state: string }) => {
			console.log('Status update:', payload.status);
			// Status updates are displayed in VS Code UI, not in the webview
		});

		// Handle error messages from extension
		api.onMessage('error', (payload: { error: string }) => {
			console.error('Received error:', payload.error);
			setError(payload.error);
			setLoading(false);
		});

		// Handle loading state
		api.onMessage('loading', () => {
			console.log('Loading diagram...');
			setLoading(true);
			setError(null);
		});

		// Handle clear command
		api.onMessage('clear', () => {
			console.log('Clearing diagram');
			setDiagramData(null);
			setLayout(null);
			setErrors([]);
			setSelectedNode(null);
			setHoveredNode(null);
			if (diagramCanvasRef.current) {
				diagramCanvasRef.current.clear();
			}
			if (errorDisplayRef.current) {
				errorDisplayRef.current.clear();
			}
		});

		// Signal that the app is ready to receive messages
		api.signalReady();

		// Cleanup is not needed for message listeners as they persist for the lifetime of the app

		return () => {
			// Cleanup if needed in future
		};
	}, [layoutEngine]);

	// Render SVG when layout is computed
	useEffect(() => {
		if (!layout || !canvasRef.current) {
			return;
		}

		try {
			// Initialize diagram canvas if not already done
			if (!diagramCanvasRef.current) {
				diagramCanvasRef.current = new DiagramCanvas({
					minWidth: 400,
					minHeight: 300,
					enableZoom: true,
					enablePan: true,
				});
			}

			// Render the layout to SVG
			const svg = diagramCanvasRef.current.render(layout, canvasRef.current);

			// Restore hierarchy state from stored state
			const hierarchyManager = diagramCanvasRef.current.getHierarchyManager();
			if (collapsedModules.size > 0) {
				hierarchyManager.restoreCollapsedState(collapsedModules);
			}

			// Handle node selection events from the diagram
			const handleNodeSelected = (event: Event) => {
				const customEvent = event as CustomEvent;
				const nodeId = customEvent.detail.nodeId;
				console.log('Node selected:', nodeId);
				setSelectedNode(nodeId);
				VsCodeApi.getInstance().selectNode(nodeId);
			};

			canvasRef.current.addEventListener('nodeSelected', handleNodeSelected);

			console.log('SVG rendered successfully:', svg);

			// Cleanup listener on unmount
			return () => {
				if (canvasRef.current) {
					canvasRef.current.removeEventListener('nodeSelected', handleNodeSelected);
				}
			};
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			console.error('Error rendering SVG:', err);
			setError(`Failed to render diagram: ${errorMsg}`);
		}
	}, [layout]);

	/**
	 * Handle example selection
	 */
	const handleExampleSelect = (filename: string) => {
		setSelectedExample(filename);
		setLoading(true);
		setError(null);
		console.log('Loading example:', filename);
		VsCodeApi.getInstance().loadExample(filename);
	};

	/**
	 * Handle node selection
	 */
	const handleNodeClick = (nodeId: string) => {
		console.log('Clicked node:', nodeId);
		setSelectedNode(nodeId);
		VsCodeApi.getInstance().selectNode(nodeId);
	};

	/**
	 * Handle node hover
	 */
	const handleNodeHover = (nodeId: string | null) => {
		setHoveredNode(nodeId);
		VsCodeApi.getInstance().hoverNode(nodeId);
	};

	/**
	 * Initialize error display
	 */
	useEffect(() => {
		if (errorPanelRef.current && !errorDisplayRef.current) {
			errorDisplayRef.current = new ErrorDisplay();
			errorDisplayRef.current.initialize(errorPanelRef.current);

			// Set up error click handler
			errorDisplayRef.current.setOnErrorClick((error: ParserError, index: number) => {
				// Highlight the error in the diagram if it has location info
				console.log('Error clicked:', error, index);
				// In a future feature, we could highlight the error zone in the diagram
			});

			// Display any existing errors
			if (errors.length > 0) {
				errorDisplayRef.current.showErrors(errors);
			}
		}
	}, [errors]);

	/**
	 * Cleanup diagram canvas on component unmount
	 */
	useEffect(() => {
		return () => {
			if (diagramCanvasRef.current) {
				diagramCanvasRef.current.destroy();
			}
		};
	}, []);

	if (error) {
		return (
			<div className="error">
				<p>Error loading diagram:</p>
				<p>{error}</p>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="loading">
				<div className="spinner"></div>
				<span>Loading diagram...</span>
			</div>
		);
	}

	if (!diagramData || !diagramData.module) {
		return (
			<div className="placeholder">
				<p>No diagram data available.</p>
				<p>Open a Verilog file and run "Show Diagram" to generate a diagram.</p>
			</div>
		);
	}

	// Render diagram with layout information
	return (
		<div className="diagram-container">
			<div className="diagram-info">
				<div className="example-selector">
					<label htmlFor="example-dropdown">Load Example:</label>
					<select
						id="example-dropdown"
						value={selectedExample}
						onChange={(e) => handleExampleSelect(e.target.value)}
					>
						{EXAMPLES.map((example) => (
							<option key={example.filename} value={example.filename}>
								{example.name} - {example.description}
							</option>
						))}
					</select>
				</div>

				{diagramData.metadata?.fileName && (
					<p>File: {diagramData.metadata.fileName}</p>
				)}
				{diagramData.module && <p>Module: {diagramData.module.name}</p>}
				<p>Ports: {diagramData.module?.ports?.length || 0}, Signals: {diagramData.module?.signals?.length || 0}, Instances: {diagramData.module?.instances?.length || 0}</p>
				{diagramData.metadata?.parseTime !== undefined && (
					<p>Parse time: {diagramData.metadata.parseTime}ms</p>
				)}
				{errors.length > 0 && (
					<p className="error-count-badge">
						<span className="error-icon">⚠️</span>
						{errors.length} error{errors.length !== 1 ? 's' : ''}
					</p>
				)}
				{layout && (
					<>
						<p>Layout: {layout.width}x{layout.height}px</p>
						<p>Positioned nodes: {layout.nodes.length}</p>
						<p>Routed edges: {layout.edges.length}</p>
					</>
				)}
			</div>

			{errors.length > 0 && showErrorPanel && (
				<div className="error-panel-container">
					<div className="error-panel-header">
						<button
							className="error-panel-toggle"
							onClick={() => setShowErrorPanel(!showErrorPanel)}
						>
							{showErrorPanel ? '▼' : '▶'} Errors
						</button>
					</div>
					<div ref={errorPanelRef} className="error-panel"></div>
				</div>
			)}

			<div className="diagram-canvas" ref={canvasRef}>
				{!layout && (
					<div className="diagram-placeholder">
						<p>Computing layout with ELK engine...</p>
						<p>Module: {diagramData.module?.name}</p>
					</div>
				)}
			</div>

			{selectedNode && (
				<div className="node-details">
					<p>Selected: {selectedNode}</p>
					{layout && layout.nodes.find((n) => n.id === selectedNode) && (
						<>
							<p>
								Position: (
								{Math.round(layout.nodes.find((n) => n.id === selectedNode)!.x)},
								{Math.round(layout.nodes.find((n) => n.id === selectedNode)!.y)})
							</p>
							<p>
								Size:{' '}
								{Math.round(layout.nodes.find((n) => n.id === selectedNode)!.width)}x
								{Math.round(layout.nodes.find((n) => n.id === selectedNode)!.height)}
							</p>
						</>
					)}
				</div>
			)}
		</div>
	);
}

export default App;
