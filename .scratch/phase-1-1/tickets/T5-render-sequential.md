# T5 — Render Sequential Logic Blocks

**What to build:** User pastes SystemVerilog code with a sequential module → diagram renders a light-filled rectangle with clock input marked with special symbol, registers labeled internally.

**Blocked by:**
- T2 (AST to ELK Transform) — needs graph with nodes positioned
- T3 (D3.js Integration) — needs D3 canvas and rendering context

**Acceptance criteria:**

- [ ] Sequential module renders as light-filled (#f5f5dc) rectangle with black border
- [ ] Clock input port marked with special triangular path symbol (◂ style)
- [ ] Other ports (data, reset, etc.) positioned on edges with triangular markers
- [ ] Port labels show signal name and width
- [ ] Registers listed internally (extract from signals with type REG/LOGIC used in always_ff)
- [ ] Module name displayed inside box
- [ ] Reset input marked if present
- [ ] Signal connections routed as black lines with width labels
- [ ] Works on `counter_4bit` example from examples/
- [ ] D3.js renders without errors
- [ ] All shapes properly scaled and positioned by ELK layout

**Implementation notes:**

- Use `d3.selectAll('g.sequential-block')` to bind nodes of type SEQUENTIAL_LOGIC
- Draw clock marker with special path (triangular arrow pointing right)
- Extract register names from signals used in `always_ff` blocks
- Display register list as small text inside the box
- Reuse port rendering from T4, just add clock special handling
- Clock should be visually distinct (different color marker or special symbol)
