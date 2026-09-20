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
const PORT = 3000;
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

  // Create port nodes
  if (module.ports) {
    module.ports.forEach((port) => {
      nodes.push({
        id: generateId('port'),
        label: port.name,
        type: 'port',
        width: 80,
        height: 40,
        shape: 'rectangle',
        color: port.direction === 'input' ? '#c8e6c9' : '#ffcccc',
        properties: {
          direction: port.direction,
          width: port.width || 1,
        },
      });
    });
  }

  // Create instance nodes (for hierarchical modules)
  if (module.instances) {
    module.instances.forEach((instance) => {
      nodes.push({
        id: generateId('instance'),
        label: instance.name || instance.module,
        type: 'instance',
        width: 120,
        height: 80,
        shape: 'rectangle',
        color: '#e1f5fe',
        properties: {
          moduleName: instance.module,
        },
      });
    });
  }

  // Create block nodes (logic blocks)
  if (module.blocks) {
    module.blocks.forEach((block, idx) => {
      const blockType = blockTypes ? blockTypes[idx] || BlockType.COMBINATIONAL : BlockType.COMBINATIONAL;

      let color = '#fff3e0';
      let shape = 'rectangle';

      if (blockType === BlockType.SEQUENTIAL) {
        color = '#bbdefb';
      } else if (blockType === BlockType.STATE_MACHINE) {
        color = '#f8bbd0';
        shape = 'circle';
      } else if (blockType === BlockType.MEMORY) {
        color = '#e1bee7';
      }

      nodes.push({
        id: generateId('block'),
        label: `${blockType}`,
        type: blockType,
        width: shape === 'circle' ? 100 : 140,
        height: shape === 'circle' ? 100 : 60,
        shape: shape,
        color: color,
        properties: {
          blockType: block.type,
        },
      });
    });
  }

  // Create edges between signals
  if (module.signals) {
    module.signals.forEach((signal) => {
      // Create edges from ports to blocks based on simple heuristics
      if (signal.name) {
        // This is simplified - a real implementation would trace signal connectivity
        edges.push({
          id: generateId('edge'),
          sources: ['unknown'],
          targets: ['unknown'],
          label: signal.name,
          properties: {
            width: signal.width || 1,
          },
        });
      }
    });
  }

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
      // Use real parser
      parseResult = await new Promise((resolve) => {
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
          try { fs.unlinkSync(tempFile); } catch (e) {}

          let json = null;
          try {
            if (stdout.trim()) {
              json = JSON.parse(stdout);
            }
          } catch (e) {
            errors.push(`Parse error: Invalid JSON from parser`);
          }

          resolve({
            json,
            stderr: stderr ? stderr.split('\n').filter(line => line.trim()) : [],
            exitCode
          });
        });

        parser.on('error', (err) => {
          try { fs.unlinkSync(tempFile); } catch (e) {}
          resolve(null);
        });
      });
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
    console.log('[PIPELINE] Stage 2: Type Detection');
    const typeDetectionStart = Date.now();
    const blockTypes = {};

    modules.forEach((mod) => {
      if (mod.blocks) {
        mod.blocks.forEach((block, idx) => {
          blockTypes[idx] = detectBlockType(mod);
        });
      }
    });

    stages.typeDetection = {
      duration: Date.now() - typeDetectionStart,
      types: blockTypes
    };

    // Stage 3: AST Transformation
    console.log('[PIPELINE] Stage 3: AST Transformation');
    const transformStart = Date.now();
    const elkGraphs = modules.map((mod) => transformToELK(mod, blockTypes));

    stages.transform = {
      duration: Date.now() - transformStart,
      graphs: elkGraphs.length
    };

    // Stage 4: ELK Layout
    console.log('[PIPELINE] Stage 4: ELK Layout');
    const layoutStart = Date.now();
    const layoutedGraphs = [];

    for (const graph of elkGraphs) {
      const layouted = await performLayout(graph);
      layoutedGraphs.push(layouted);
    }

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
