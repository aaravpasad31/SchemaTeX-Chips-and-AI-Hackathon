# T4 — Render Combinational Logic Blocks

**What to build:** User pastes SystemVerilog code with a combinational module → diagram renders a light-filled rectangle with proper port labels, signal connections, and no clock input.

**Blocked by:**
- T2 (AST to ELK Transform) — needs graph with nodes positioned
- T3 (D3.js Integration) — needs D3 canvas and rendering context

**Acceptance criteria:**

- [ ] Combinational module renders as light-filled (#f5f5dc) rectangle with black border
- [ ] Ports positioned on edges (left for inputs, right for outputs) with triangular markers
- [ ] Port labels show signal name and width (e.g., "sel[3:0]")
- [ ] No clock input displayed (or if present, marked as asynchronous)
- [ ] Signal connections shown as black lines with bus width labels
- [ ] Module name displayed inside box
- [ ] Works on `decoder` example (from examples/)
- [ ] D3.js renders without errors
- [ ] All shapes properly scaled and positioned by ELK layout

**Implementation notes:**

- Use `d3.selectAll('g.combinational-block')` to bind nodes of type COMBINATIONAL_LOGIC
- Append `<rect>` for box, `<text>` for labels, `<polygon>` for port markers
- Pull visual properties from ELK graph metadata
- No fill colors beyond #f5f5dc and black lines
- Test on examples/decoder.sv or create simple decoder example if needed
