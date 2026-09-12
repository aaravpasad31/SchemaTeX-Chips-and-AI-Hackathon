# SchemaTeX: Synchronized Diagrams for Hardware Design

Transform SystemVerilog code into interactive block diagrams—automatically synchronized. Edit the code, see the diagram update instantly. For complex logic, Claude can infer high-level abstractions.

## Quick Start

### Prerequisites
- CMake 3.10+
- C++17 compiler
- Node.js 16+ (for VSCode extension)
- VS Code 1.70+

### Building the Parser

```bash
cd parser
mkdir build && cd build
cmake ..
make
./schematex-parser ../examples/counter_4bit.sv
```

This outputs a JSON AST representing the 4-bit counter module.

### Installing the VSCode Extension

```bash
cd extension
npm install
npm run compile
# Then open VS Code and press Ctrl+Shift+D on a .sv file to show the diagram
```

## Project Structure

```
SchemaTeX/
├── parser/              # C++ SystemVerilog parser
│   ├── src/             # Parser implementation
│   ├── include/         # Header files
│   ├── tests/           # Unit tests
│   ├── CMakeLists.txt
│   └── README.md
├── extension/           # VSCode extension (TypeScript/React)
│   ├── src/             # Extension code
│   ├── package.json
│   └── tsconfig.json
├── shared/              # Shared types and schemas
│   └── ast-schema.json  # JSON schema for parser output
├── examples/            # Sample .sv files
│   └── counter_4bit.sv  # First validation example
├── docs/
│   ├── CONTEXT.md       # Domain model glossary
│   └── adr/             # Architectural decision records
├── CLAUDE.md            # Project configuration
└── README.md            # This file
```

## Architecture

**Three-layer design:**

1. **Parser (C++)**: Reads `.sv` files, outputs JSON AST
2. **Renderer (TypeScript/React)**: Consumes AST, renders interactive SVG diagram using ELK layout engine
3. **VSCode Extension**: Bridges parser and renderer, watches file changes, manages user interaction

**Key design decisions:**
- Parser and renderer communicate via JSON over CLI subprocess
- Diagram generation is deterministic (no LLM judgment)
- Claude assists only when inferring abstractions for complex patterns (optional)
- Unidirectional sync: code → diagram (V1)

See `docs/adr/` for architectural rationale.

## Features (V1)

### Supported SystemVerilog
- Module declarations with ports
- Combinational logic (`assign`, `always_comb`)
- Sequential logic (`always_ff`)
- Module instantiation (hierarchical)
- Parameters and generate blocks
- Wire/net declarations with bit-widths

### Diagram Features
- Interactive SVG rendering in VSCode webview
- Pan, zoom, auto-fit on load
- Click nets to highlight connections
- Hover for signal details (name, width, type)
- Collapsible hierarchy for nested modules
- Color-coded ports (green input, red output, gray internal)
- Error zones for unparseable code

### Optional: AI Abstraction (Claude)
- User-triggered "Simplify" button
- Claude infers high-level blocks for complex patterns
- Preserves verifiability (base diagram is always correct)

## Validation

The 4-bit counter (`examples/counter_4bit.sv`) exercises:
- Sequential logic (`always_ff`)
- Combinational logic (`always_comb`)
- Port declarations and bit-widths
- Clean rendering and interaction

Run the full pipeline:

```bash
# Parse the counter
./parser/build/schematex-parser examples/counter_4bit.sv > /tmp/ast.json

# Inspect the JSON AST
cat /tmp/ast.json | jq .

# Then open the extension in VS Code and view the diagram
```

## Testing

```bash
# Parser tests
cd parser/build
ctest

# Extension tests (later)
cd extension
npm test
```

## Contributing

1. **Parser changes**: Update `parser/src/`, rebuild, test with `examples/*.sv`
2. **Renderer changes**: Update `extension/src/`, TypeScript compilation is automatic
3. **Documentation**: Update `CONTEXT.md` for domain changes, add ADRs for big decisions
4. **Examples**: Add new .sv files to `examples/` for validation

## Domain Model

See `CONTEXT.md` for glossary of core terms:
- **Module**: Hardware unit with ports and logic
- **Port**: Input/output/inout connection
- **Net/Signal**: Wire carrying data
- **Logic Block**: Combinational or sequential logic
- **Instance**: Instantiated module within parent
- **Generate Block**: Compile-time instantiation

## Next Steps

- [ ] Complete C++ lexer for full SystemVerilog tokenization
- [ ] Implement parser AST builder
- [ ] Build diagram renderer and ELK integration
- [ ] VSCode extension file watcher and webview integration
- [ ] Claude API integration for abstraction inference
- [ ] Terminal UI (ANSI) for CLI workflow
- [ ] Spec → SystemVerilog generation (future)

## License

TBD

## Authors

SchemaTeX-Chips-and-AI-Hackathon Team
