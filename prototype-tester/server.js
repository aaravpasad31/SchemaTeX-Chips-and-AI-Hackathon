/**
 * PROTOTYPE: SchemaTeX Parser Bridge Server
 *
 * Minimal Express server that:
 * 1. Receives SystemVerilog code via POST
 * 2. Writes to temp file
 * 3. Spawns the C++ parser subprocess
 * 4. Returns JSON AST
 *
 * Run with: npm start
 * Then open http://localhost:3000
 *
 * This is throwaway code to verify the parser works end-to-end.
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ELK = require('elkjs');

const app = express();
const PORT = process.env.PORT || 3000;
const elk = new ELK();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.text({ limit: '10mb' }));

/**
 * Mock parser for testing when C++ parser is unavailable
 * Parses basic SystemVerilog structure from code string
 */
function mockParse(code, res, tempFile) {
  try {
    const modules = [];
    const errors = [];

    // Simple regex-based parsing
    const moduleMatch = code.match(/module\s+(\w+)\s*\(([\s\S]*?)\);/);

    if (!moduleMatch) {
      errors.push('1:1: No module found');
      try { fs.unlinkSync(tempFile); } catch (e) {}
      return res.json({
        json: { modules: [], errors },
        errors: ['No module declaration found'],
        parseError: null,
        exitCode: 1
      });
    }

    const moduleName = moduleMatch[1];
    const portSection = moduleMatch[2];

    // Extract ports
    const portRegex = /(?:input|output|inout)\s+(?:wire|logic|reg)?\s*(?:\[[\d:]+\])?\s*(\w+)/g;
    const ports = [];
    let portMatch;
    while ((portMatch = portRegex.exec(portSection)) !== null) {
      ports.push({
        name: portMatch[1],
        direction: portSection.includes('input') ? 'input' : 'output',
        width: 1,
        type: 'wire'
      });
    }

    // Extract internal signals
    const signalRegex = /(?:wire|logic|reg)\s*(?:\[(\d+):0\])?\s*(\w+);/g;
    const signals = [];
    while ((portMatch = signalRegex.exec(code)) !== null) {
      signals.push({
        name: portMatch[2],
        type: 'wire',
        width: portMatch[1] ? parseInt(portMatch[1]) + 1 : 1
      });
    }

    // Extract blocks (always_comb, always_ff)
    const blocks = [];
    if (code.includes('always_comb')) {
      blocks.push({ type: 'always_comb', lineStart: 0, lineEnd: 0 });
    }
    if (code.includes('always_ff')) {
      blocks.push({ type: 'always_ff', lineStart: 0, lineEnd: 0 });
    }

    modules.push({
      name: moduleName,
      filepath: `${moduleName}.sv`,
      ports,
      signals,
      blocks,
      instances: [],
      parameters: [],
      errors: []
    });

    try { fs.unlinkSync(tempFile); } catch (e) {}

    res.json({
      json: { modules, errors },
      errors: errors.length > 0 ? errors : [],
      parseError: null,
      exitCode: 0
    });
  } catch (error) {
    try { fs.unlinkSync(tempFile); } catch (e) {}
    res.status(500).json({
      error: 'Mock parse failed',
      json: null,
      errors: [error.message]
    });
  }
}

/**
 * Block Type Detection (T1)
 * Classifies modules into 6 types based on AST structure
 */
const BlockType = {
  HIERARCHICAL: 'HIERARCHICAL',
  COMBINATIONAL: 'COMBINATIONAL',
  SEQUENTIAL: 'SEQUENTIAL',
  STATE_MACHINE: 'STATE_MACHINE',
  MEMORY: 'MEMORY',
  MIXED: 'MIXED',
};

function detectBlockType(module) {
  const hasInstances = module.instances && module.instances.length > 0;
  const blocks = module.blocks || [];
  const signals = module.signals || [];

  const hasBlocks = blocks.length > 0;
  const hasOnlyAlwaysComb = blocks.length > 0 && blocks.every((b) =>
    b.type === 'always_comb' || b.type === 'assign'
  );
  const hasAlwaysFf = blocks.some((b) => b.type === 'always_ff');

  // Rule 1: HIERARCHICAL - instances exist, no blocks
  if (hasInstances && !hasBlocks) {
    return BlockType.HIERARCHICAL;
  }

  // Rule 6: MIXED - instances > 0 && blocks > 0
  if (hasInstances && hasBlocks) {
    return BlockType.MIXED;
  }

  // Rule 2: COMBINATIONAL - only combinational blocks
  if (hasOnlyAlwaysComb) {
    return BlockType.COMBINATIONAL;
  }

  // Rule 3: STATE_MACHINE - has always_ff + state signal
  if (hasAlwaysFf && isStateMachine(blocks, signals)) {
    return BlockType.STATE_MACHINE;
  }

  // Rule 4: MEMORY - array declarations + read/write patterns
  if (hasMemoryPattern(blocks, signals)) {
    return BlockType.MEMORY;
  }

  // Rule 5: SEQUENTIAL - has always_ff blocks
  if (hasAlwaysFf) {
    return BlockType.SEQUENTIAL;
  }

  // Default
  return BlockType.COMBINATIONAL;
}

function isStateMachine(blocks, signals) {
  const hasAlwaysFf = blocks.some((b) => b.type === 'always_ff');
  if (!hasAlwaysFf) return false;

  // Look for state-like signals or case statements
  const stateSignals = signals.filter(s =>
    s.name && (s.name.includes('state') || s.name.includes('State'))
  );

  return stateSignals.length > 0;
}

function hasMemoryPattern(blocks, signals) {
  // Look for array declarations
  const hasArrays = signals.some(s => s.type && s.type.includes('['));

  if (!hasArrays) return false;

  // Look for read/write patterns in blocks
  const blockText = blocks.map(b => JSON.stringify(b)).join('');
  const hasReadWrite = blockText.includes('read') || blockText.includes('write');

  return hasReadWrite;
}

/**
 * Detect signal type (clock, reset, data)
 * Based on signal name and properties
 */
function detectSignalType(signalName) {
  const name = signalName.toLowerCase();

  // Clock signals
  if (name.includes('clk') || name.includes('clock') || name === 'clk_i' || name === 'clk_o') {
    return 'clock';
  }

  // Reset signals
  if (name.includes('reset') || name.includes('rst') || name === 'reset_n' || name === 'rst_n') {
    return 'reset';
  }

  // Power/Ground
  if (name === 'vcc' || name === 'vdd' || name === 'gnd' || name === 'vss') {
    return 'power';
  }

  // Default to data
  return 'data';
}

/**
 * AST to ELK Transformation (T2)
 * Converts parsed AST into ELK graph format
 */
function transformToELK(module, blockTypes) {
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 0;

  function generateId(prefix) {
    return `${prefix}_${nodeIdCounter++}`;
  }

  // Check if this is a hierarchical module (has instances)
  const isHierarchical = module.instances && module.instances.length > 0;

  if (isHierarchical) {
    // Create hierarchical container node for the parent module
    const containerChildren = [];
    const instanceNodeMap = {};

    // Create instance nodes as children of the container with improved sizing
    module.instances.forEach((instance) => {
      const instanceId = generateId('instance');
      instanceNodeMap[instance.name] = instanceId;

      containerChildren.push({
        id: instanceId,
        label: instance.name || instance.module,
        width: 140,  // Increased from 120 for better label fit
        height: 90,  // Increased from 80
        properties: {
          moduleName: instance.module,
          nodeType: 'instance',
          color: '#e1f5fe',
        },
      });
    });

    // Create port nodes (on the container's perimeter)
    const portNodes = [];
    if (module.ports) {
      module.ports.forEach((port) => {
        const signalType = detectSignalType(port.name);
        portNodes.push({
          id: generateId('port'),
          label: port.name,
          width: 80,
          height: 40,
          properties: {
            direction: port.direction,
            width: port.width || 1,
            nodeType: 'port',
            signalType: signalType,
            color: port.direction === 'input' ? '#c8e6c9' : '#ffcccc',
          },
        });
      });
    }

    // Calculate container dimensions based on instance count
    const numInstances = containerChildren.length;
    const cols = Math.max(2, Math.ceil(Math.sqrt(numInstances)));
    const rows = Math.ceil(numInstances / cols);
    const containerWidth = Math.max(500, cols * 200 + 60);
    const containerHeight = Math.max(350, rows * 150 + 100);

    // Add port constraints metadata to ports
    if (module.ports) {
      module.ports.forEach((port) => {
        const signalType = detectSignalType(port.name);
        // Determine port side based on direction and signal type
        if (signalType === 'power') {
          port.side = 'TOP';
        } else if (signalType === 'power' && port.name.toLowerCase().includes('gnd')) {
          port.side = 'BOTTOM';
        } else if (port.direction === 'input') {
          port.side = 'LEFT';
        } else {
          port.side = 'RIGHT';
        }
      });
    }

    // Create the main hierarchical container node with improved layout options
    const containerId = generateId('hierarchical');
    nodes.push({
      id: containerId,
      label: module.name || 'Module',
      children: containerChildren,
      width: containerWidth,
      height: containerHeight,
      layoutOptions: {
        'elk.algorithm': 'layered',  // Sugiyama hierarchical layout
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '80',  // Proper spacing between instances
        'elk.spacing.edgeNode': '30',
        'elk.spacing.edgeEdge': '30',
        'elk.padding': '[50, 50, 50, 50]',
        'elk.layered.crossingMinimization': 'LAYER_SWEEP',  // Better crossing reduction
        'elk.layered.nodePlacement.strategy': 'INTERACTIVE',
        'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
        'elk.edgeRouting': 'SPLINE',  // Smoother edge routing
        'elk.portConstraints': 'FIXED_SIDE',  // Respect port side constraints
        'elk.port.side': 'SMART',  // Auto-optimize port placement
      },
      properties: {
        nodeType: 'hierarchical_container',
        color: 'transparent',
        ports: module.ports, // Store ports as metadata, not as separate nodes
      },
    });

    // NOTE: Do NOT add port nodes to the graph for hierarchical modules
    // Ports are stored as metadata on the container and rendered as visual elements on the edge
    // This prevents ELK from positioning them independently

    // Create edges from container to instances
    // Only connect critical signals (clk, reset) to all instances
    // Skip connecting every port to every instance (creates spaghetti)
    if (module.ports) {
      const criticalSignals = ['clk', 'clock', 'reset', 'rst'];

      module.ports.forEach((port) => {
        // Only create edges for critical signals
        if (criticalSignals.some(sig => port.name.toLowerCase().includes(sig))) {
          // Connect only to first instance to reduce clutter (representative connection)
          if (containerChildren.length > 0) {
            const signalWidth = port.width || 1;
            const isBus = signalWidth > 1;
            const widthLabel = isBus ? `[${signalWidth - 1}:0]` : '';
            const signalType = detectSignalType(port.name);

            edges.push({
              id: generateId('edge'),
              sources: [containerId],
              targets: [containerChildren[0].id],
              label: port.name,
              properties: {
                width: signalWidth,
                portName: port.name,
                isBus: isBus,
                widthLabel: widthLabel,
                signalType: signalType,
              },
            });
          }
        }
      });
    }

    // Skip instance-to-instance edges (creates clutter)
  } else {
    // Non-hierarchical module: create port and block nodes normally

    // Create port nodes
    if (module.ports) {
      module.ports.forEach((port) => {
        nodes.push({
          id: generateId('port'),
          label: port.name,
          width: 80,
          height: 40,
          properties: {
            direction: port.direction,
            width: port.width || 1,
            nodeType: 'port',
            color: port.direction === 'input' ? '#c8e6c9' : '#ffcccc',
          },
        });
      });
    }

    // Create ONE block node for the entire module (pure logic)
    if (module.blocks && module.blocks.length > 0) {
      const blockType = blockTypes?.[0] || BlockType.COMBINATIONAL;

      let color = '#fff3e0';
      let shape = 'rectangle';

      if (blockType === BlockType.SEQUENTIAL) {
        color = '#bbdefb';
      } else if (blockType === BlockType.STATE_MACHINE) {
        color = '#f8bbd0';
        shape = 'ellipse';
      } else if (blockType === BlockType.MEMORY) {
        color = '#e1bee7';
      } else if (blockType === BlockType.COMBINATIONAL) {
        color = '#fff3e0';
      }

      nodes.push({
        id: generateId('block'),
        label: `${module.name || blockType}`,
        layoutOptions: {
          'elk.nodeLabels.placement': 'CENTER CENTER',
        },
        width: shape === 'ellipse' ? 100 : 140,
        height: shape === 'ellipse' ? 100 : 80,
        color: color,
        properties: {
          blockType: blockType,
          nodeType: 'block',
          shapeType: shape,
        },
      });
    }
  }

  // Note: Edges for hierarchical modules are created in the hierarchical branch above
  // For non-hierarchical pure-logic modules, edges are not yet needed

  return {
    id: `graph_${module.name || 'main'}`,
    label: module.name || 'Module',
    children: nodes,
    edges: edges,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '50',
      'elk.padding': '[15, 15, 15, 15]',
    },
  };
}

/**
 * ELK Layout Engine Integration (T3)
 */
async function performLayout(graph) {
  try {
    const result = await elk.layout(graph);
    return result;
  } catch (error) {
    console.error('[LAYOUT] ELK layout failed:', error);
    // Return the graph with default coordinates if layout fails
    return {
      ...graph,
      children: (graph.children || []).map((node, idx) => ({
        ...node,
        x: 100 + (idx % 3) * 200,
        y: 100 + Math.floor(idx / 3) * 150,
      })),
    };
  }
}

// Serve static frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend.html'));
});

/**
 * POST /api/parse
 *
 * Body: { code: string } - SystemVerilog code
 *
 * Response: { json: object, errors: string[] }
 * - json: parsed AST from C++ parser
 * - errors: stderr output from parser
 */
app.post('/api/parse', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.trim() === '') {
      return res.status(400).json({
        error: 'Empty code',
        json: null,
        errors: ['No SystemVerilog code provided']
      });
    }

    // Write code to temp file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `schematex-${Date.now()}.sv`);
    fs.writeFileSync(tempFile, code);

    console.log(`[PARSE] Temp file: ${tempFile}`);

    // Spawn parser process
    // Try multiple parser paths (macOS/Linux, Windows, build directory)
    let parserPath = path.join(__dirname, '..', 'parser', 'schematex-parser');
    if (!fs.existsSync(parserPath)) {
      parserPath = path.join(__dirname, '..', 'parser', 'schematex-parser.exe');
    }
    if (!fs.existsSync(parserPath)) {
      parserPath = path.join(__dirname, '..', 'parser', 'build', 'Release', 'schematex-parser.exe');
    }

    if (!fs.existsSync(parserPath)) {
      console.log(`[PARSE] ⚠️ Parser not found at any expected path`);
      console.log(`[PARSE] Using mock parser for testing`);
      // Use mock parser for testing
      return mockParse(code, res, tempFile);
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const parser = spawn(parserPath, [tempFile]);

      parser.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      parser.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      parser.on('close', (exitCode) => {
        console.log(`[PARSE] Parser exited with code: ${exitCode}`);
        console.log(`[PARSE] Stdout length: ${stdout.length}`);
        console.log(`[PARSE] Stderr: ${stderr}`);

        // Cleanup temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.warn(`Failed to delete temp file: ${e.message}`);
        }

        // If parser crashed, fallback to mock
        if (exitCode !== 0 && !stdout.trim()) {
          console.log(`[PARSE] Parser crashed (exit code ${exitCode}), falling back to mock`);
          return mockParse(code, res, tempFile);
        }

        // Parse JSON output
        let json = null;
        let parseError = null;

        try {
          if (stdout.trim()) {
            json = JSON.parse(stdout);
          }
        } catch (e) {
          parseError = `Invalid JSON from parser: ${e.message}`;
          console.error(`[PARSE] ${parseError}`);
        }

        res.json({
          json,
          errors: stderr ? stderr.split('\n').filter(line => line.trim()) : [],
          parseError: parseError || null,
          exitCode: exitCode
        });

        resolve();
      });

      parser.on('error', (err) => {
        console.error(`[PARSE] Failed to spawn parser: ${err.message}`);
        console.log(`[PARSE] Falling back to mock parser`);
        // Cleanup and use mock parser
        try { fs.unlinkSync(tempFile); } catch (e) {}
        mockParse(code, res, tempFile);
        resolve();
      });
    });
  } catch (error) {
    console.error('[PARSE] Unexpected error:', error);
    res.status(500).json({
      error: 'Unexpected error',
      json: null,
      errors: [error.message]
    });
  }
});

/**
 * POST /api/full-pipeline
 *
 * Complete end-to-end pipeline:
 * Parse → Type Detection → AST Transform → ELK Layout → D3 Ready
 *
 * Body: { code: string }
 * Response: { success: boolean, stages: {...}, layout: {...}, errors: [] }
 */
app.post('/api/full-pipeline', async (req, res) => {
  const startTime = Date.now();
  const { code } = req.body;
  const stages = {};
  const errors = [];

  try {
    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Empty code',
        errors: ['No SystemVerilog code provided'],
        stages: {}
      });
    }

    // Stage 1: Parse
    console.log('[PIPELINE] Stage 1: Parse');
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `schematex-${Date.now()}.sv`);
    fs.writeFileSync(tempFile, code);

    let parseResult = null;
    let parserPath = path.join(__dirname, '..', 'parser', 'schematex-parser');
    if (!fs.existsSync(parserPath)) {
      parserPath = path.join(__dirname, '..', 'parser', 'schematex-parser.exe');
    }

    if (fs.existsSync(parserPath)) {
      // Use real parser with 10-second timeout
      console.log('[PIPELINE] Spawning real parser at:', parserPath);
      parseResult = await new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        const parser = spawn(parserPath, [tempFile]);
        console.log('[PIPELINE] Parser spawned, waiting for output...');

        let parserTimedOut = false;
        const parserTimeout = setTimeout(() => {
          console.warn('[PIPELINE] ⚠️ Parser timeout (10s), killing process...');
          parserTimedOut = true;
          parser.kill('SIGKILL');
          try { fs.unlinkSync(tempFile); } catch (e) {}
          resolve(null);  // Fall through to mock parser
        }, 10000);

        parser.stdout.on('data', (data) => {
          console.log('[PIPELINE] Parser stdout data:', data.length, 'bytes');
          stdout += data.toString();
        });

        parser.stderr.on('data', (data) => {
          console.log('[PIPELINE] Parser stderr:', data.toString().slice(0, 100));
          stderr += data.toString();
        });

        parser.on('close', (exitCode) => {
          if (!parserTimedOut) {
            clearTimeout(parserTimeout);
            console.log('[PIPELINE] Parser closed with code:', exitCode);
            try { fs.unlinkSync(tempFile); } catch (e) {}

            let json = null;
            try {
              if (stdout.trim()) {
                console.log('[PIPELINE] Parsing JSON output...');
                json = JSON.parse(stdout);
                console.log('[PIPELINE] JSON parsed, modules:', json.modules?.length);
              } else {
                console.log('[PIPELINE] No stdout from parser');
              }
            } catch (e) {
              console.error('[PIPELINE] JSON parse failed:', e.message);
              errors.push(`Parse error: Invalid JSON from parser`);
            }

            console.log('[PIPELINE] Resolving parseResult');
            resolve({
              json,
              stderr: stderr ? stderr.split('\n').filter(line => line.trim()) : [],
              exitCode
            });
          }
        });

        parser.on('error', (err) => {
          clearTimeout(parserTimeout);
          console.error('[PIPELINE] Parser error:', err.message);
          try { fs.unlinkSync(tempFile); } catch (e) {}
          resolve(null);
        });
      });
      if (!parseResult) {
        console.log('[PIPELINE] Real parser failed, falling back to mock parser');
      }
    }

    // Fallback to mock parser if real parser not available
    if (!parseResult) {
      console.log('[PIPELINE] Using mock parser');
      // Extract basic structure from code
      const moduleMatch = code.match(/module\s+(\w+)\s*\(([\s\S]*?)\);/);
      if (!moduleMatch) {
        errors.push('1:1: No module found');
        return res.json({
          success: false,
          errors: ['No module declaration found'],
          stages: {}
        });
      }

      const moduleName = moduleMatch[1];
      const portSection = moduleMatch[2];

      // Extract ports (simplified)
      const ports = [];
      const portRegex = /(?:input|output|inout)\s+(?:wire|logic|reg)?\s*(?:\[[\d:]+\])?\s*(\w+)/g;
      let portMatch;
      while ((portMatch = portRegex.exec(portSection)) !== null) {
        const direction = portSection.substring(0, portRegex.lastIndex).lastIndexOf('input') >
                         portSection.substring(0, portRegex.lastIndex).lastIndexOf('output') ? 'input' : 'output';
        ports.push({
          name: portMatch[1],
          direction: direction,
          width: 1,
          type: 'wire'
        });
      }

      // Extract signals
      const signals = [];
      const signalRegex = /(?:wire|logic|reg)\s*(?:\[(\d+):0\])?\s*(\w+);/g;
      while ((portMatch = signalRegex.exec(code)) !== null) {
        signals.push({
          name: portMatch[2],
          type: 'wire',
          width: portMatch[1] ? parseInt(portMatch[1]) + 1 : 1
        });
      }

      // Extract blocks
      const blocks = [];
      if (code.includes('always_comb')) {
        blocks.push({ type: 'always_comb', id: 'comb_0', inputs: [], outputs: [] });
      }
      if (code.includes('always_ff')) {
        blocks.push({ type: 'always_ff', id: 'ff_0', clk: 'clk', inputs: [], outputs: [] });
      }

      parseResult = {
        json: {
          modules: [{
            name: moduleName,
            filepath: `${moduleName}.sv`,
            ports,
            signals,
            blocks,
            instances: [],
            parameters: []
          }]
        },
        stderr: [],
        exitCode: 0
      };
    }

    if (!parseResult || !parseResult.json || !parseResult.json.modules) {
      return res.json({
        success: false,
        error: 'Failed to parse code',
        errors,
        stages: {}
      });
    }

    stages.parse = {
      duration: Date.now() - startTime,
      modules: parseResult.json.modules.length,
      errors: parseResult.stderr || []
    };

    const modules = parseResult.json.modules;
    if (!modules || modules.length === 0) {
      return res.json({
        success: false,
        error: 'No modules found in parsed code',
        errors,
        stages
      });
    }

    // Stage 2: Type Detection
    console.log('[PIPELINE] Stage 2: Type Detection START');
    const typeDetectionStart = Date.now();
    const blockTypes = {};

    modules.forEach((mod) => {
      console.log('[PIPELINE] Detecting type for module:', mod.name);
      if (mod.blocks) {
        mod.blocks.forEach((block, idx) => {
          blockTypes[idx] = detectBlockType(mod);
        });
      } else {
        console.log('[PIPELINE]   No blocks, module is hierarchical');
      }
    });

    stages.typeDetection = {
      duration: Date.now() - typeDetectionStart,
      types: blockTypes
    };
    console.log('[PIPELINE] Stage 2: Type Detection DONE in', stages.typeDetection.duration, 'ms');

    // Stage 3: AST Transformation
    console.log('[PIPELINE] Stage 3: AST Transformation');
    const transformStart = Date.now();
    const elkGraphs = modules.map((mod) => transformToELK(mod, blockTypes));

    stages.transform = {
      duration: Date.now() - transformStart,
      graphs: elkGraphs.length
    };

    // Stage 4: ELK Layout
    console.log('[PIPELINE] Stage 4: ELK Layout START');
    const layoutStart = Date.now();
    const layoutedGraphs = [];

    for (let i = 0; i < elkGraphs.length; i++) {
      const graph = elkGraphs[i];
      console.log(`[PIPELINE] Laying out graph ${i}:`, graph.id, '- children:', graph.children?.length || 0);
      const layouted = await performLayout(graph);
      console.log(`[PIPELINE] Finished layout for graph ${i}`);
      layoutedGraphs.push(layouted);
    }
    console.log('[PIPELINE] Stage 4: ELK Layout DONE in', Date.now() - layoutStart, 'ms');

    stages.layout = {
      duration: Date.now() - layoutStart,
      graphs: layoutedGraphs.length
    };

    stages.total = Date.now() - startTime;

    res.json({
      success: true,
      stages,
      parseResult: parseResult.json,
      layoutedGraphs,
      blockTypes,
      errors
    });

  } catch (error) {
    console.error('[PIPELINE] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errors: [error.message],
      stages
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`SchemaTeX Prototype Tester`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✨ Server running at http://localhost:${PORT}`);
  console.log(`\n📝 Paste SystemVerilog code and click "Parse"`);
  console.log(`\n🧪 Tests the full pipeline: parser → JSON → diagram\n`);
});
