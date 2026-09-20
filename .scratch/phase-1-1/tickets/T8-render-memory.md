# T8 — Render Memory Blocks

**What to build:** User pastes memory module code with array declarations → diagram shows light-filled box with diagonal hatch pattern, address/data ports, and capacity labeled.

**Blocked by:**
- T2 (AST to ELK Transform) — needs graph with memory nodes
- T3 (D3.js Integration) — needs D3 canvas and rendering context

**Acceptance criteria:**

- [ ] Memory block renders as light-filled (#f5f5dc) rectangle with black border
- [ ] Diagonal hatch pattern overlaid on rectangle (SVG pattern or opacity layer)
- [ ] Module name displayed inside box
- [ ] Capacity labeled (e.g., "64x32" for 64 words × 32 bits)
- [ ] Clock input marked with special triangular symbol
- [ ] Address input port labeled (e.g., "addr[5:0]")
- [ ] Data input port labeled (e.g., "data_in[31:0]")
- [ ] Data output port labeled (e.g., "data_out[31:0]")
- [ ] Control signals (we, re, valid) positioned on edges with labels
- [ ] Signal connections routed as black lines with width labels
- [ ] Works on `ram_controller` example
- [ ] D3.js renders without errors
- [ ] All ports and shapes properly positioned by ELK layout

**Implementation notes:**

- Use `d3.selectAll('g.memory-block')` to bind nodes of type MEMORY_BLOCK
- Create SVG `<defs>` pattern with diagonal lines for hatch fill
- Extract capacity from array size in AST (e.g., `logic [31:0] mem [0:63]`)
- Display as "depth × width" format
- Reuse port rendering from T4/T5, add hatch pattern
- Clock handling same as T5 (triangular marker)
- Memory-specific ports: addr (input), data_in (input), data_out (output), we/re (control)
- Hatch pattern should be subtle (light stroke, alpha ~0.3) so text remains readable
