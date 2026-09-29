# SchemaTeX Domain Model & Architecture

For Claude sessions: understand the domain concepts, architecture, and design decisions. Start here if you're unfamiliar with the project.

## Overview

SchemaTeX is a tool that transforms SystemVerilog RTL code into interactive professional block diagrams. The front end is **deterministic**: designs are elaborated by the slang compiler, with no LLM guessing. Claude assists only when inferring high-level abstractions for complex patterns.

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

### Two-Part System

1. **Server** (Python in `server/`, see [ADR 0003](docs/adr/0003-slang-elaboration-server.md))
   - `schematex/extract.py` runs [slang](https://github.com/MikePopoloski/slang) (via `pyslang`) to parse **and elaborate** the source, then walks the instance tree
   - Returns JSON: diagnostics plus, per instance, ports, signals, logic blocks (reads / writes / clocks) and child instances with their port connections
   - `app.py` serves it as `POST /api/parse` on port 3001; `python -m schematex file.sv` prints the same JSON

2. **Web App** (React/TypeScript in `web/`)
   - `src/lib/classify.ts`: block type detection (the 6 types below)
   - `src/lib/graph.ts`: turns one level of the hierarchy into nodes, fixed-position ports and net edges
   - `src/lib/layout.ts`: ELK layered layout with orthogonal routing
   - `src/components/D3Canvas.tsx`: SVG rendering, zoom/pan, net highlighting, drill-down
   - Uses React built-in state. The Vite dev server proxies `/api` to the server.

The JSON contract is defined by `server/schematex/extract.py` and mirrored in `web/src/types/index.ts`.

### Data Pipeline

```
SystemVerilog Code
    ↓
[slang] → elaborated instance tree (JSON)          server/
    ↓
[Type Detection] → hierarchical, mixed, FSM, memory, sequential, combinational
    ↓
[Graph] → nodes (ports, blocks, instances) + edges (driver → sink per net)
    ↓
[ELK Layout] → positioned nodes & routed wires
    ↓
[D3.js Render] → SVG; zoom/pan, click a net, double-click to open an instance
```

### Nets and signal names

Signal names are relative to the instance that owns them (`count_next`, or `stage[0].x` inside a generate block).

Every reference the server reports is `{name, bits}`:
- A constant-index select of an **unpacked array** names its own element (`taps[2]`, `link[0][1]`); each element is effectively its own variable.
- A constant **bit or part select** of a vector keeps its range: `carry[3]` is `{name: "carry", bits: [3, 3]}`, and `data[7:4]`, `data[4 +: 4]` and `data[7 -: 4]` are all `bits: [4, 7]`.
- Anything with a non-constant index (`mem[addr]`, `a[i]` in a procedural loop) refers to the whole signal (`bits: null`).

`graph.ts` connects a driver to a reader only when the bits they touch **overlap**. So `cnt1` driving `cnt1[3]` is a wire, while `carry[1]` and `carry[2]` are separate, and a ripple-carry chain draws as a chain. Clicking a wire highlights the whole signal.

---

## Key Design Constraints

### Determinism
SystemVerilog → diagram generation is **deterministic**. No randomness, no LLM judgment in the core pipeline. Accuracy is verifiable against parsed RTL. This is non-negotiable.

### Unidirectional Sync (V1)
Code is the source of truth. File save triggers diagram regeneration. **Diagram edits do NOT flow back to code** in V1 (one-way only).

### Modular Coupling
Server and web app communicate **only via JSON** over HTTP. No tight coupling. Either component can be swapped independently.

### Supported Subset (V1)
slang accepts the full language. The **diagram** shows:
- `assign` statements and all procedural blocks (`always_ff`, `always_comb`, `always_latch`, `always`, `initial`, `final`)
- Module instances, including those in generate blocks and instance arrays (flattened into the parent)
- Parameters (elaborated values) and ports (input/output/inout)

**Not drawn yet**: interfaces and modports, instances of undefined modules, assertions, classes.

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
- Detection: No child instances and no `always_ff` blocks
- Visual: Light box with logic indicator
- Example: `decoder`, `multiplexer`, `adder`

### 3. Sequential Logic
- Definition: Registered logic with state
- Detection: Contains `always_ff` blocks (and isn't an FSM or memory)
- Visual: Light box with clock marker (◂)
- Example: `counter`, `shift_register`, `pipeline_stage`

### 4. State Machine
- Definition: Explicit FSM with enum state register
- Detection: an enum-typed signal is written by an `always_ff` block
- Visual: State circles with labeled transitions
- Example: `ctrl_fsm`, `read_write_controller`

### 5. Memory Block
- Definition: Array-based storage with read/write logic
- Detection: an unpacked-array signal is written by an `always_ff` block
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

### `.claude/` & `.agents/`
Claude Code configuration. Specifies skills, hooks, and agent behaviors for this project.

### `.git/`
Git repository with clean history. Check recent commits via `git log` for context on recent changes.

---

## Conventions

### Code Organization
- **Server**: `schematex/extract.py` is the whole elaboration → JSON step; `app.py` is a thin HTTP wrapper
- **Web**: one component per file (`Editor`, `Diagram`, `D3Canvas`); pure logic in `src/lib/`, with no React there
- **Types**: TypeScript types in `web/src/types/`, which mirror the server JSON

### Testing
- **Design suite** (`tests/designs/`): 63 designs by category, each stating its expected type, wires, instance count and diagnostics in `// @expect-*` comments. See `tests/designs/README.md`. Add a design there whenever you fix a bug.
- `server/tests/test_corpus.py` elaborates every suite design and checks its annotations. It also checks that every extracted reference resolves to a declared signal.
- `web/src/lib/corpus.test.ts` lays out every level of every suite design (no overlaps, every wire routed) and checks `@expect-type` / `@expect-net`. It calls the Python extractor directly, so it needs `server/.venv`.
- `server/tests/test_extract.py` and `web/src/lib/graph.test.ts` are focused unit tests on `examples/`. The web ones use `__fixtures__/`; regenerate those with `make fixtures`.
- `make test` runs everything.

### Examples
Teaching examples in `examples/`, simple to complex, one design per file. The web app loads them directly, so adding a `.sv` file there adds it to the dropdown.

---

## Next Steps for New Contributors

1. Read [README.md](README.md) for quick start and project overview
2. Understand the block type detection rules above
3. Run `python -m schematex ../examples/counter_4bit.sv` in `server/` to see the JSON
4. Run `make dev` and trace the same example through `web/src/lib/`
5. See `docs/adr/` for architectural decision records

---

## Known Issues

- **Unknown modules aren't drawn.** An instance of an undefined module produces a slang error and is omitted from the diagram. It should become a black box.
- **Invalid expressions carry no wires.** If an expression has an error (e.g. an undeclared identifier), slang marks it invalid and the block loses those connections.
- **Interfaces aren't wired.** Interface instances appear as boxes, but connections made through interface ports aren't drawn (`tests/designs/language/interface_bus.sv`).
- **FSM detection needs an enum.** A state machine encoded with plain vectors (one-hot, localparam states) classifies as sequential (`tests/designs/fsm/onehot_fsm.sv`).
- **A self-instantiating module is never a top.** A recursive module needs a wrapper to be drawn (`tests/designs/hierarchy/recursive_tree.sv`).
- **Vite config precedence.** Vite loads `web/vite.config.js` before `vite.config.ts`. Keep only the `.ts` file; the tsconfig no longer emits a `.js` copy.

---

## Future Vision

- **Phase 1.2**: Export (PNG, PDF, SVG), file upload, project management
- **Phase 2**: AI-assisted abstraction, annotation layer, custom styles
- **Phase 3**: Timing analysis, critical-path highlighting, simulation integration
