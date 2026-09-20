# T10 — Expand/Collapse Hierarchy

**What to build:** User clicks on hierarchical module box → children expand/collapse, layout re-runs, state persists during session.

**Blocked by:**
- T6 (Render Hierarchical Modules)

Requires hierarchical rendering to work.

**Acceptance criteria:**

- [ ] Hierarchical parent box is clickable
- [ ] Click → toggles expanded/collapsed state
- [ ] Collapsed module shows as single box with title
- [ ] Expanded module shows children inside
- [ ] ELK layout re-runs on toggle (new positions computed)
- [ ] D3 transitions smoothly between expanded/collapsed (optional but nice)
- [ ] Expansion state persists during session (store in React state)
- [ ] Works on multi-level hierarchies (can expand/collapse at any level)
- [ ] Cursor changes to indicate clickability (pointer on hover)
- [ ] Multiple modules can be independently collapsed/expanded
- [ ] Signal paths update correctly after expand/collapse
- [ ] No performance issues with re-layout on large designs

**Implementation notes:**

- Use D3 `click` handler on parent box `<rect>`
- Track `collapsedModules` Map in React state (key: module ID, value: boolean)
- When module clicked, toggle its entry in Map
- On toggle, call LayoutEngine to re-run ELK layout
- Update D3 SVG nodes/edges based on new layout positions
- Use D3 transitions to animate position changes (optional)
- Prevent click from bubbling to parent modules
- Visual indicator: cursor: pointer on hover, maybe highlight box lightly
- Test on processor with multiple instances, deep hierarchies
