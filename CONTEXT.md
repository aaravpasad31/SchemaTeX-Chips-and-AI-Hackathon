# SchemaTeX Domain Model & Architecture

For Claude sessions: understand the domain concepts, architecture, and design decisions. Start here if you're unfamiliar with the project.

## Overview

SchemaTeX is a tool that transforms SystemVerilog RTL code into interactive professional block diagrams. The parser is **deterministic** (no LLM guessing)—Claude assists only when inferring high-level abstractions for complex patterns.

## Core Concepts

### Module
The basic unit of hardware design in SystemVerilog. Encapsulates ports (inputs/outputs), internal signals, combinational/sequential logic, and instances of other modules. In diagrams, rendered as a labeled box with ports on edges.

### Port
An input, output, or inout connection on a module. Carries signals in/out. Visualized with triangular markers:
- **Input** ◄ (green)
- **Output** ► (red)
- **Inout** ◆ (gray)

### Net / Signal
A wire or bus connecting ports and logic. Has a name and bit-width. In diagrams, shown as labeled lines; clickable to highlight the entire connected path.

### Logic Block
Internal combinational or sequential construct:
- **Combinational**: `assign` or `always_comb` — outputs computed from inputs, no state
- **Sequential**: `always_ff` — state-holding with clock/reset

### Instance
Instantiation of a module within another module (hierarchy). Shown as nested boxes in the diagram; collapsible/expandable for navigation.

### Generate Block
Compile-time construct creating multiple instances. Elaborated (unrolled) in diagrams; each generated instance shown separately.

### Parameter
Compile-time constant configuring a module. Passed at instantiation. Shown in diagrams where relevant (e.g., bus widths).

### Abstraction Level
For simple logic (assign, always_comb, always_ff), the diagram is 1:1 with code. For complex patterns (nested loops, conditional generation, complex FSMs), higher-level representations can be inferred. User triggers via "Simplify" button—Claude may assist here.

---

## Architecture Overview

### Three-Part System

1. **Parser** (C++ in `parser/`)
   - Deterministic extraction of AST from SystemVerilog code
   - No ambiguity, no heuristics—faithful to the source
   - Outputs JSON AST matching `shared/ast-schema.json`
   - Runs as HTTP server on port 3001

2. **Web App** (React/TypeScript in `web/`)
   - User interface: paste code, see diagram
   - Organized in `src/{components,hooks,types,utils}`
   - Uses React built-in state (no Redux/Zustand needed yet)
   - Communicates with parser via HTTP `/parse` endpoint

3. **Shared Schema** (`shared/ast-schema.json`)
   - Contract between parser and web app
   - Defines structure of the JSON AST

### Data Pipeline

```
SystemVerilog Code
    ↓
[Parser] → JSON AST
    ↓
[Type Detection] → Block type (hierarchical, combinational, sequential, FSM, memory, mixed)
    ↓
[ELK Layout] → Positioned nodes & routed wires
    ↓
[D3.js Render] → SVG diagram
    ↓
[Interactive Web App] → User sees diagram, can zoom/pan/expand
```

---

## Key Design Constraints

### Determinism
SystemVerilog → diagram generation is **deterministic**. No randomness, no LLM judgment in the core pipeline. Accuracy is verifiable against parsed RTL. This is non-negotiable.

### Unidirectional Sync (V1)
Code is the source of truth. File save triggers diagram regeneration. **Diagram edits do NOT flow back to code** in V1 (one-way only).

### Modular Coupling
Parser and web app communicate **only via JSON AST** over HTTP. No tight coupling. Either component can be swapped independently.

### Supported Subset (V1)
- `assign` statements
- `always_comb` blocks
- `always_ff` blocks
- Module instantiation
- Parameters and generate blocks
- Port declarations (input/output/inout)

**Not supported in V1**: assertions, interfaces, advanced constraint handling, procedural blocks outside always.

---

## Block Type Detection (6 Types)

Modules are classified into 6 mutually exclusive categories:

### 1. Hierarchical Container
- Definition: Only child module instances, no internal logic
- Detection: `instances.length > 0 && blocks.length == 0`
- Visual: Large box containing smaller module boxes
- Example: `processor` containing `mem_ctrl`, `alu`, `cache_controller`

### 2. Combinational Logic
- Definition: Pure combinational blocks, no state
- Detection: Only `always_comb` blocks, no `always_ff`
- Visual: Light box with logic indicator
- Example: `decoder`, `multiplexer`, `adder`

### 3. Sequential Logic
- Definition: Registered logic with state
- Detection: Contains `always_ff` blocks with state variables
- Visual: Light box with clock marker (◂)
- Example: `counter`, `shift_register`, `pipeline_stage`

### 4. State Machine
- Definition: Explicit FSM with enum state register
- Detection: Enum type + case statement on state + transitions
- Visual: State circles with labeled transitions
- Example: `ctrl_fsm`, `read_write_controller`

### 5. Memory Block
- Definition: Array-based storage with read/write logic
- Detection: Array declarations + read/write port patterns
- Visual: Box with diagonal hatch pattern
- Example: `ram_controller`, `cache_line_array`

### 6. Mixed Module
- Definition: Both child instances AND internal logic
- Detection: `instances.length > 0 && blocks.length > 0`
- Visual: Large hierarchy container with nested logic blocks
- Example: `top_system` with submodules and internal logic

---

## Relationships

- A **Module** contains **Logic Blocks**, **Instances**, and **Ports**
- **Logic Blocks** read/write **Nets** connected to **Ports**
- **Instances** are modules instantiated within parents (recursive hierarchy)
- **Generate Blocks** create multiple **Instances** at elaboration
- **Abstraction** transforms complex patterns into higher-level representations

---

## Project Configuration

### `.vscode/`
VS Code settings for C++ debugging, build tasks, and launch configurations.

### `.claude/` & `.agents/`
Claude Code configuration. Specifies skills, hooks, and agent behaviors for this project.

### `.git/`
Git repository with clean history. Check recent commits via `git log` for context on recent changes.

---

## Conventions

### Code Organization
- **Parser**: Lexer → Token → AST → JSON serialization (standard compiler pipeline)
- **Web**: One component per file, organized by feature (Editor, Diagram, D3Canvas)
- **Types**: TypeScript types in `web/src/types/`, shared constants in `web/src/utils/`

### Testing
- Parser tests in `parser/tests/` (separate from source)
- Web tests to be added to `web/tests/` as coverage grows

### Examples
Teaching examples in `examples/` — simple to complex, one design per file.

---

## Next Steps for New Contributors

1. Read [README.md](README.md) for quick start and project overview
2. Understand the block type detection rules above
3. Check `shared/ast-schema.json` to see the AST structure
4. Run a simple example (e.g., `counter_4bit.sv`) and trace through the pipeline
5. See `docs/adr/` for architectural decision records

---

## Known Issues & Workarounds

### Parser Hierarchical Timeout
The C++ parser can hang on deeply nested hierarchical modules due to recursive traversal. 
- **Workaround**: 10-second timeout + mock fallback in web app
- **Status**: Documented in memory; consider fix in future refactor

---

## Future Vision

- **Phase 1.2**: Export (PNG, PDF, SVG), file upload, project management
- **Phase 2**: AI-assisted abstraction, annotation layer, custom styles
- **Phase 3**: Timing analysis, critical-path highlighting, simulation integration
