# T7 — Render State Machines

**What to build:** User pastes FSM code with explicit enum state register → diagram shows state circles with labeled transitions as arrows between them.

**Blocked by:**
- T2 (AST to ELK Transform) — needs graph with state nodes and transitions
- T3 (D3.js Integration) — needs D3 canvas and rendering context

**Acceptance criteria:**

- [ ] State circles render as light-filled (#f5f5dc) with black border
- [ ] State name displayed inside circle (e.g., "IDLE")
- [ ] State value displayed below name (e.g., "0x0")
- [ ] Transitions render as arrows between circles
- [ ] Arrow labels show transition condition (from case statement)
- [ ] Arrows route cleanly without overlapping (use ELK)
- [ ] FSM container shown as dashed box around all states
- [ ] Works on traffic light FSM example (IDLE → READ → WRITE → DONE)
- [ ] Multiple transitions from single state handled correctly
- [ ] Self-loops for state transitions render properly
- [ ] D3.js renders without errors

**Implementation notes:**

- Use `d3.selectAll('circle.fsm-state')` for state nodes
- Use `d3.selectAll('path.fsm-transition')` for arrows
- State circles should be uniform size (e.g., radius 30)
- Transitions are directed arrows (use D3 marker-end for arrowheads)
- Extract state names and values from AST (enum definitions)
- Extract transition conditions from case statements on state register
- Dashed box can be drawn with `<rect stroke-dasharray="4,4">`
- Ensure arrows don't overlap with state circles (use ELK routing)
