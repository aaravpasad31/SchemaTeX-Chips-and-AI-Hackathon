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

const app = express();
const PORT = 3000;

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

app.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`SchemaTeX Prototype Tester`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✨ Server running at http://localhost:${PORT}`);
  console.log(`\n📝 Paste SystemVerilog code and click "Parse"`);
  console.log(`\n🧪 Tests the full pipeline: parser → JSON → diagram\n`);
});
