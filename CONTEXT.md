# SchemaTeX Domain Model

## Overview

SchemaTeX is a tool that keeps SystemVerilog code and hardware diagrams synchronized. Engineers edit RTL code; diagrams auto-regenerate. The parser is deterministic (no LLM); Claude assists only when inferring abstractions for complex patterns.

## Core Concepts

### Module
A SystemVerilog module—the basic unit of hardware design. Encapsulates ports, logic, and instances of other modules. In the diagram, rendered as a box with ports on the edges.

### Port
An input, output, or inout connection on a module. Carries signals in/out. Visualized with color coding: green (input), red (output), gray (internal).

### Net / Signal
A wire or bus connecting ports and logic. Has a name and bit-width. Rendered as labeled lines in the diagram; clickable to highlight all connected nodes.

### Logic Block
A combinational or sequential construct within a module:
- **Combinational**: `assign` statements or `always_comb` blocks. Computed output from inputs with no state.
- **Sequential**: `always_ff` blocks. State-holding logic with clock and reset.

### Instance
An instantiation of a module within another module. In the diagram, shown as a nested box within the parent. Can be collapsed/expanded for hierarchy navigation.

### Generate Block
A compile-time construct that creates multiple instances of logic based on parameters. Elaborated (unrolled) in the diagram; each generated instance shown as a separate box.

### Parameter
A compile-time constant that configures a module. Passed at instantiation time. Displayed in diagrams where relevant (e.g., width of buses).

### Abstraction Level
For simple logic (assign, always_comb, always_ff), the diagram is 1:1 with the code. For complex patterns (nested loops, conditional generation, abstract state machines), Claude infers a higher-level representation (e.g., "this is a FIFO controller"). User triggers via "Simplify" button.

## Key Design Constraints

1. **Determinism**: SystemVerilog → diagram generation must be deterministic. No randomness, no LLM judgment. Accuracy is verifiable against parsed RTL.

2. **Unidirectional Sync (V1)**: Code is source of truth. File save triggers diagram regeneration. Diagram edits do not flow back to code in V1.

3. **Interactive Rendering**: Diagrams are interactive SVG/HTML in VSCode webview. Users can pan, zoom, click signals to highlight, collapse/expand hierarchy.

4. **Modular Architecture**: Parser (C++) and renderer (TS/React) communicate only via JSON AST over CLI subprocess. No tight coupling.

5. **Supported Subset (V1)**: `assign`, `always_comb`, `always_ff`, module instantiation, parameters, generate blocks. No assertions, interfaces, or advanced features in V1.

## Relationships

- A **Module** contains **Logic Blocks**, **Instances**, and **Ports**.
- **Logic Blocks** read/write **Nets** connected to **Ports**.
- **Instances** are modules instantiated within parent modules (recursive hierarchy).
- **Generate Blocks** create multiple **Instances** at elaboration time.
- **Abstraction** transforms complex patterns into higher-level representations (Claude-assisted).
