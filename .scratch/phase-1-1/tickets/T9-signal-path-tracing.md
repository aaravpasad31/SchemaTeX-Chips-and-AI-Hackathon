# T9 — Signal Path Highlighting (Hover/Click)

**What to build:** User hovers or clicks a signal/wire → entire datapath highlights, showing source to destination with intermediate wires and signal metadata displayed.

**Blocked by:**
- T4 (Render Combinational)
- T5 (Render Sequential)
- T6 (Render Hierarchical)
- T7 (Render State Machines)
- T8 (Render Memory)

All block types must render first.

**Acceptance criteria:**

- [ ] Hover over wire → highlights entire signal path (source to destination)
- [ ] Click wire → selection persists, showing full metadata
- [ ] Source and destination ports clearly marked/highlighted
- [ ] Signal name, width, and type shown in tooltip or sidebar
- [ ] All intermediate wires with same signal name highlighted
- [ ] Highlight color distinct but not garish (suggestions: #0066ff at 50% opacity)
- [ ] Width changes/slicing operations shown in labels
- [ ] Transitive connections highlighted (fan-in/fan-out)
- [ ] Hover out → highlight disappears
- [ ] Click another wire → selection updates
- [ ] Works on multi-level hierarchies
- [ ] No performance impact (D3 selection efficient)

**Implementation notes:**

- Listen to D3 `mouseover` and `click` events on edges
- When signal selected, use `d3.selectAll('path.signal-edge')` to filter by signal name
- Highlight matching edges by setting `stroke` color and `stroke-width`
- Display metadata in sidebar or tooltip (use existing error-display component as reference)
- Track selected signal in React state to persist selection
- Implement click to deselect (click same wire again)
- Use CSS classes for highlighting states (hover, selected, inactive)
- Consider performance: if design has 2000+ signals, filtering may be slow (optimize with index if needed)
