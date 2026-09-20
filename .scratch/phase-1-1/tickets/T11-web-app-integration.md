# T11 — Web App UI + End-to-End Pipeline

**What to build:** User opens prototype-tester web app → pastes SystemVerilog code → clicks "Render" → sees fully interactive diagram with zoom, pan, hover signal tracing, and expand/collapse hierarchy all working end-to-end.

**Blocked by:**
- T1 (Block Type Detection)
- T2 (AST to ELK Transform)
- T3 (D3.js Integration)
- T4 (Render Combinational)
- T5 (Render Sequential)
- T6 (Render Hierarchical)
- T7 (Render State Machines)
- T8 (Render Memory)
- T9 (Signal Path Highlighting)
- T10 (Expand/Collapse)

All features must complete.

**Acceptance criteria:**

- [ ] Textarea for code input visible and functional
- [ ] "Render" button triggers full pipeline
- [ ] Pipeline: Parse → Detect Types → Transform → ELK Layout → D3 Render
- [ ] Zoom/pan works (mouse wheel, click-drag)
- [ ] Signal hover highlighting works
- [ ] Expand/collapse module hierarchy works
- [ ] Error messages display on parse failure (with line number)
- [ ] No console errors during render
- [ ] Works on all test cases:
  - [ ] counter_4bit.sv (sequential)
  - [ ] decoder.sv or similar (combinational)
  - [ ] processor.sv with instances (hierarchical)
  - [ ] FSM example (state machine)
  - [ ] RAM controller (memory)
- [ ] Performance acceptable (< 5 seconds for 500-module design)
- [ ] Export to SVG button (optional for MVP, but good to have)
- [ ] Responsive layout (diagram scales to window)

**Implementation notes:**

**Frontend Changes (prototype-tester/frontend.html):**
- Add textarea element for code input
- Add "Render" button
- Add SVG canvas container (d3-canvas div)
- Add error display panel
- Add zoom/pan controls (optional, D3 handles via keyboard/mouse)
- Add sidebar for signal metadata display

**Backend/Extension Changes:**
- Wire up parser-bridge to parse code from textarea
- Call BlockTypeDetector on parsed AST
- Call ASTTransformer with block types
- Run ELK layout
- Render with D3 (via d3-renderer)
- Listen for hover/click events → signal tracing
- Listen for module clicks → expand/collapse
- Pass errors to error display

**Testing:**
- E2E test: paste counter code → verify SVG renders with correct elements
- Performance test: measure end-to-end time for medium design
- Visual test: verify diagram matches spec (IEEE 91-1984 style)
- Interaction test: verify hover, click, zoom all work

**Success Criteria:**
User can paste working RTL code, click Render, and immediately see professional diagram with all interactive features working.
