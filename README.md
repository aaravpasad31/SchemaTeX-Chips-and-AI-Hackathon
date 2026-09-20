# SchemaTeX

**Interactive tool to visualize SystemVerilog RTL code as professional block diagrams.**

SchemaTeX automatically generates IEEE-standard hardware schematics from your Verilog code. Upload or paste RTL, get an interactive diagram showing module hierarchy, datapath connectivity, and signal flow.

## Features

- **Automatic Parsing**: Deterministic parser extracts instances, signals, and logic blocks from SystemVerilog
- **Block Type Detection**: Intelligently classifies modules as hierarchical containers, combinational logic, sequential logic, state machines, memories, or mixed designs
- **Interactive Diagrams**: 
  - Zoom and pan for navigation
  - Expand/collapse module hierarchy
  - Click signals to trace datapath connectivity
  - See signal names, widths, and types
- **Professional Output**: IEEE 91-1984 standard styling with clean layout, no overlaps
- **Fast & Deterministic**: Parse and render in < 5 seconds, no LLM guessing

## Quick Start

### Web App (No Build Required)

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173 in your browser. Paste SystemVerilog code and click "Render".

### Running the Parser Server

The web app needs the parser HTTP API running:

```bash
cd parser
cmake -B build
cmake --build build
./build/parser_server --port 3001
```

Or run it in the background:

```bash
cd parser/build && ./parser_server --port 3001 &
```

See [Parser Build Instructions](parser/BUILD_INSTRUCTIONS.md) for detailed setup.

## Project Structure

```
SchemaTeX/
├── README.md                 # This file
├── CONTEXT.md               # Domain concepts & architecture (for Claude)
│
├── parser/                  # C++ SystemVerilog parser
│   ├── src/                 # Parser source code
│   ├── include/             # Header files
│   ├── tests/               # Parser unit tests
│   ├── CMakeLists.txt       # Build config
│   └── BUILD_INSTRUCTIONS.md
│
├── web/                     # React web application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions & constants
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/               # Component and integration tests
│   └── vite.config.ts
│
├── examples/                # Reference SystemVerilog files
│   ├── counter_4bit.sv
│   ├── counter_chain.sv
│   ├── processor.sv
│   └── ...
│
├── shared/                  # Shared data schemas
│   └── ast-schema.json      # Parser output schema
│
└── docs/                    # Documentation
    └── adr/                 # Architectural Decision Records
```

## Configuration

- `.vscode/` — VS Code settings (C++ debugging, tasks)
- `.claude/` — Claude Code configuration and settings
- `.agents/` — Agent skills and tools

See CONTEXT.md for details on project conventions and how Claude sessions should navigate the codebase.

## How It Works

1. **Parse**: C++ parser reads SystemVerilog → extracts modules, ports, signals, instances → outputs JSON AST
2. **Detect**: TypeScript layer classifies each module by type (combinational, sequential, FSM, etc.)
3. **Layout**: ELK (Eclipse Layout Kernel) positions all elements, routes wires to minimize crossings
4. **Render**: D3.js draws clean SVG diagram with interactive features

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Parser | C++ | Extract AST from SystemVerilog |
| Web App | React + TypeScript | UI and visualization |
| Rendering | D3.js + SVG | Interactive diagrams |
| Layout | ELK.js | Deterministic graph positioning |
| Styling | Tailwind CSS | UI styling |

## Development

### For Web Development

```bash
cd web
npm install
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run tests (when available)
```

### For Parser Development

```bash
cd parser
mkdir -p build && cd build
cmake ..
make -j4
./parser_test  # Run test suite
```

See [BUILD_INSTRUCTIONS.md](parser/BUILD_INSTRUCTIONS.md) for details.

## Examples

Load any of these in the web app to see SchemaTeX in action:

- **counter_4bit.sv** — Simple sequential counter (2-3 ports, 1 always_ff block)
- **counter_chain.sv** — Hierarchical design with module instances
- **processor.sv** — Complex multi-module system
- **mux_4to1.sv** — Combinational logic example

## Contributing

Contributions welcome! Areas of focus:

- Extend parser to support more SystemVerilog features
- Improve layout algorithm for larger designs
- Add visualization features (highlighting, annotations, export)
- Test coverage and performance optimization

Before starting work, check [CONTEXT.md](CONTEXT.md) to understand the domain model and architecture.

## Performance Targets

- **Parse Time**: < 1 second
- **Layout Time**: < 2 seconds
- **Render Time**: < 500ms
- **Total**: < 5 seconds for typical designs (up to 500 modules)

## Future Enhancements

- File upload and drag-and-drop
- Project management (save/load diagrams)
- Export to PNG, PDF, SVG
- Signal timing annotations
- Simulation integration
- Custom rendering styles

## License

[Add license here]

## Questions?

See CONTEXT.md for a deep dive into the domain model, architecture, and key design decisions.
