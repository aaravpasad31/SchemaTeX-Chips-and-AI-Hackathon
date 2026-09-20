# T6 — Render Hierarchical Modules

**What to build:** User pastes SystemVerilog code with module instances → diagram shows large parent box containing smaller child module boxes with wires connecting instance ports.

**Blocked by:**
- T2 (AST to ELK Transform) — needs graph with hierarchical nesting
- T3 (D3.js Integration) — needs D3 canvas and rendering context

**Acceptance criteria:**

- [ ] Parent module renders as large box with black border, no fill
- [ ] Child module instances render as smaller light-filled (#f5f5dc) boxes inside parent
- [ ] Parent box title shows module name
- [ ] Parent ports (I/O) positioned on outer edge with triangular markers
- [ ] Child instance ports positioned on child box edges
- [ ] Signal connections routed between instances as black lines with width labels
- [ ] Wires avoid overlaps (use ELK routing)
- [ ] Works on `processor` example (with `mem_ctrl`, `alu`, `cache_controller` instances)
- [ ] Nested hierarchy (3-4 levels deep) displays correctly
- [ ] D3.js renders without errors
- [ ] All elements properly scaled and positioned by ELK layout

**Implementation notes:**

- Use `d3.selectAll('g.hierarchical-parent')` for parent boxes
- Use `d3.selectAll('g.hierarchical-child')` for instance boxes
- Parent box should be larger, children nested inside using D3 transforms
- Preserve ELK layout positions (already computed by transform step)
- Route wires using D3 paths with ELK-provided edge paths
- Handle multiple instances correctly (no ID collisions)
- Test on examples/processor.sv or create example if needed
