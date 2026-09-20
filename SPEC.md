# SchemaTeX Phase 1.1: RTL Diagram Auto-Generation Specification

## Overview

Auto-generate professional IEEE-standard RTL schematics from SystemVerilog code. Show module hierarchy, datapaths, and signal connectivity with clean, deterministic layout using ELK + D3.js.

---

## 6 Mutually Exclusive Block Types

### 1. Hierarchical Container
- **Definition**: Module containing only child module instances, no internal logic
- **Detection**: `instances.length > 0 && blocks.length == 0`
- **Visual**: Large box containing smaller module boxes, ports on perimeter
- **Example**: `processor` containing `mem_ctrl`, `alu`, `cache_controller`

### 2. Combinational Logic
- **Definition**: Pure combinational blocks, no state storage (only `always_comb`)
- **Detection**: Only `always_comb` blocks, no `always_ff`, no state registers
- **Visual**: Light-filled rectangular box with logic symbol inside (optional)
- **Example**: `decoder`, `multiplexer`, `adder`

### 3. Sequential Logic
- **Definition**: Registered logic with state (`always_ff` blocks)
- **Detection**: Contains `always_ff` blocks with state variables
- **Visual**: Light-filled rectangular box with clock input marked with special symbol
- **Example**: `counter`, `shift_register`, `pipeline_stage`

### 4. State Machine
- **Definition**: Explicit FSM with enum state register and state transitions
- **Detection**: 
  - Explicit `enum` type for state register
  - Case statement on state register
  - State transition logic
- **Visual**: State circles (filled) with labeled transitions as arrows
- **Example**: `ctrl_fsm`, `read_write_controller`

### 5. Memory Block
- **Definition**: Array-based storage with read/write logic
- **Detection**:
  - Array declarations: `logic [width] mem [0:depth-1]`
  - Read/write port patterns (addr, data, we, re)
- **Visual**: Light-filled box with diagonal hatch pattern, capacity labeled
- **Example**: `ram_controller`, `cache_line_array`

### 6. Mixed Module
- **Definition**: Contains both child instances AND internal logic
- **Detection**: `instances.length > 0 && blocks.length > 0`
- **Visual**: Large hierarchy container with both module boxes and logic blocks inside, wires connecting all
- **Example**: `top_system` with `mem_ctrl`, `mux`, `counter` all present

---

## Visual Specification (IEEE 91-1984 Standard)

### Style Guide
- **Lines**: Black only, stroke-width 1.5–2.0
- **Fills**: `#f5f5dc` (pale beige) for components only
- **Ports**: Triangular markers filled black (input/output symbols)
- **Text**: Courier New monospace, 10pt labels, 8pt details
- **Grid**: Light background (20×20) for reference only
- **No overlaps**: All elements properly spaced, ELK-routed wires

### Port Symbols
- **Input port**: Triangle pointing inward ◄
- **Output port**: Triangle pointing outward ►
- **Clock signal**: Special triangular path marker (like: ◂)

### Wire Labeling
- Signal names placed along wires
- Bus widths shown: `[31:0]`, `[7:0]`, etc.
- Clear, monospace font

### Hierarchy Representation
- Parent box contains child boxes
- Clean nesting, no visual clutter
- Port positions relative to parent edges

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Parser** | C++ (schematex-parser) | Extract AST from SystemVerilog |
| **Type Detection** | TypeScript | Classify modules into 6 block types |
| **Layout** | ELK (Eclipse Layout Kernel) | Position elements, route wires |
| **Rendering** | D3.js + SVG | Generate interactive diagrams |
| **Platform** | Web app (React/TypeScript) | User interface, paste code, view diagram |

---

## Data Pipeline (Modular Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PARSER (C++)                                                 │
│    Input: SystemVerilog code                                    │
│    Output: JSON AST                                             │
│    ├─ modules[]                                                 │
│    │  ├─ name, filepath                                        │
│    │  ├─ ports[] (name, direction, width)                      │
│    │  ├─ signals[] (name, type, width)                         │
│    │  ├─ blocks[] (type: always_comb|always_ff, inputs/outputs)│
│    │  └─ instances[] (name, module_type, connections)          │
│    └─ errors[]                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. TYPE DETECTION (TypeScript)                                  │
│    For each module, classify into 6 block types                │
│    Deterministic rules (see Block Type Detection section)      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. AST TRANSFORM (TypeScript)                                   │
│    Convert JSON AST → ELK graph format                          │
│    ├─ Nodes: modules, blocks, state circles                    │
│    ├─ Edges: instances, signal connections                     │
│    └─ Metadata: ports, widths, types                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. ELK LAYOUT                                                   │
│    Input: Graph with nodes and edges                           │
│    Output: Positioned nodes (x, y, width, height)              │
│    Algorithm: Hierarchical layout (appropriate for RTL)        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. D3.js RENDER (TypeScript)                                    │
│    Input: Positioned nodes and edges                           │
│    Output: SVG with:                                           │
│    ├─ Rectangles for logic blocks (filled #f5f5dc)            │
│    ├─ Circles for FSM states (filled #f5f5dc)                 │
│    ├─ Paths for wires (black lines)                           │
│    ├─ Triangles for ports (black fills)                       │
│    ├─ Text labels (Courier monospace)                         │
│    └─ Grid background (light)                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. INTERACTIVE CANVAS (D3.js + Web App)                        │
│    User interactions:                                          │
│    ├─ Zoom/Pan (mouse wheel, drag)                           │
│    ├─ Expand/Collapse (click module box)                      │
│    ├─ Signal Tracing (hover/click wire → highlight path)     │
│    └─ State Management (remember expansion state)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Block Type Detection (Deterministic Rules)

Assumes RTL follows **best practices**:
- FSMs use explicit `enum` for state register
- Memories use array declarations
- Clear combinational/sequential patterns
- No legacy code or nonstandard styles

### Detection Algorithm

```
FOR EACH module IN parsed_modules:
  
  IF instances.count > 0 AND blocks.count == 0:
    → HIERARCHICAL_CONTAINER
  
  ELSE IF blocks.count > 0:
    has_always_comb = ANY(block.type == "always_comb")
    has_always_ff = ANY(block.type == "always_ff")
    has_enum_state = ANY(signal.type == "enum")
    has_case_on_state = PARSE(blocks, case statements on state)
    has_arrays = ANY(signal.type contains array)
    
    IF has_always_ff AND has_enum_state AND has_case_on_state:
      → STATE_MACHINE
    
    ELSE IF has_arrays AND (has_always_ff OR has_always_comb):
      → MEMORY_BLOCK
    
    ELSE IF only_has_always_comb:
      → COMBINATIONAL_LOGIC
    
    ELSE IF has_always_ff:
      → SEQUENTIAL_LOGIC
  
  ELSE IF instances.count > 0 AND blocks.count > 0:
    → MIXED_MODULE
  
  ELSE:
    → UNKNOWN (error)
```

---

## Scale & Performance

### Target Scope
- **Modules**: Up to 500
- **Signals**: Up to 2000
- **Hierarchy Depth**: 3–4 levels
- **Wire Crossings**: ELK handles crossing minimization

### Performance Targets
- **Parse Time**: < 1 second (C++ parser)
- **Type Detection**: < 100ms (TypeScript)
- **ELK Layout**: < 2 seconds (medium graphs)
- **D3 Render**: < 500ms (SVG generation)
- **Total**: < 5 seconds from paste to rendered diagram

### Graceful Degradation
If ELK layout exceeds time budget:
1. Collapse hierarchy below depth N
2. Remove internal signal connections (show only I/O ports)
3. Retry layout
4. Show warning: "Design too complex, simplified view"

---

## User Interaction (MVP Phase 1.1)

### Input Workflow
1. User opens web app
2. Pastes SystemVerilog code into textarea
3. Clicks "Render" button
4. System: Parse → Detect types → Layout → Display

### Interactive Features
- **Zoom**: Mouse wheel / pinch
- **Pan**: Click-drag canvas
- **Expand/Collapse**: Click on module box to toggle hierarchy
- **Signal Tracing**: 
  - Hover over wire → highlights entire signal path (source to destination)
  - Shows signal name, width, type
  - Highlights all intermediate wires with same signal name
- **Error Display**: Inline error messages if parsing fails

### Hierarchy Expansion Strategy (Smart Expansion)
- **Leaf modules** (no children): Always expanded, show internals
- **Parent modules**: Collapsed by default
- **User override**: Click to expand any module manually
- **Rationale**: Shows architectural detail where it matters, avoids visual chaos

### Future Enhancement (Phase 2)
- AI determines "interesting" modules to auto-expand
- User customization settings (expansion preferences per project)

---

## Error Handling

### Parser Errors (Malformed RTL)
- **Strategy**: Fail-fast
- **Behavior**: 
  - Show error message with line number
  - Refuse to render incomplete/broken diagram
  - Display helpful hint (e.g., "Expected ';' after module declaration")
- **Rationale**: Encourages users to fix RTL before visualization

### Layout Issues (Design Exceeds Capacity)
- **Strategy**: Graceful degradation with retry
- **Behavior**:
  1. If ELK layout exceeds 2-second timeout:
     - Auto-collapse modules below depth N
     - Retry layout with simplified graph
     - Show warning: "Simplified view (depth limited to N levels)"
  2. If still exceeds timeout:
     - Collapse all hierarchy (show only top-level connections)
     - Show error: "Design too large, try simpler subset"
- **Rationale**: Users still get a usable diagram, can iterate

---

## Success Criteria (MVP = Phase 1.1 Complete)

### Functional
- ✅ Parser extracts instances, signals, blocks from real RTL
- ✅ TypeScript detects 6 block types deterministically
- ✅ AST transforms to ELK-compatible graph format
- ✅ ELK lays out 500-module design in < 2 seconds
- ✅ D3.js renders clean IEEE-standard SVG output
- ✅ Web app accepts pasted code and displays diagram

### Interactive
- ✅ Zoom, pan on canvas
- ✅ Expand/collapse module hierarchy (click to toggle)
- ✅ Hover/click signal → highlights full datapath
- ✅ Signal metadata displayed (name, width, type)

### Quality
- ✅ No overlapping elements (ELK routing verified)
- ✅ Grid-aligned, professional appearance
- ✅ Error handling for parse failures
- ✅ Graceful degradation on layout timeouts
- ✅ Performance < 5 seconds end-to-end

### Test Coverage
- ✅ Parser test suite (16 passing tests)
- ✅ Type detection tests (each block type)
- ✅ Layout output validation (no overlaps, proper positioning)
- ✅ E2E test (code paste → diagram render)

---

## Future Enhancements (Phase 1.2+)

### Phase 1.2: Polish & Features
- Export to PNG, PDF, high-res SVG
- File upload + drag-and-drop
- Project management (save/load diagrams)
- Comprehensive test suite
- Performance profiling

### Phase 2: AI & Customization
- AI identifies interesting modules for auto-expansion
- User annotation layer (add notes, labels, highlights)
- Collaborative feedback
- Custom rendering styles per company

### Phase 3: Advanced Analysis
- Signal timing annotation
- Datapath critical-path highlighting
- Cross-module dependency graphs
- Simulation integration (show signal values)

---

## Implementation Checklist

### Parser Enhancement
- [ ] Verify instance parsing works on hierarchical designs
- [ ] Test enum type extraction (for FSM detection)
- [ ] Test array type extraction (for memory detection)
- [ ] Ensure JSON output matches spec

### TypeScript Layer
- [ ] Implement 6 block type detection functions
- [ ] Transform AST to ELK graph format
- [ ] Handle hierarchical nesting in transform
- [ ] Test on counter, hierarchical, FSM examples

### ELK Integration
- [ ] Install ELK.js in web app
- [ ] Configure hierarchical layout algorithm
- [ ] Test on medium-scale graphs
- [ ] Measure performance, optimize if needed

### D3.js Rendering
- [ ] Render rectangles for logic blocks
- [ ] Render circles for FSM states
- [ ] Render paths for wires
- [ ] Render port triangles
- [ ] Implement grid background
- [ ] Add text labels

### Interactive Canvas
- [ ] Zoom/pan with D3
- [ ] Click handlers for expand/collapse
- [ ] Hover handlers for signal tracing
- [ ] State persistence (which modules expanded)

### Web App Integration
- [ ] Textarea for code input
- [ ] "Render" button triggers pipeline
- [ ] Error display on parse failures
- [ ] SVG canvas display

### Testing
- [ ] Unit tests: type detection
- [ ] Integration tests: parse → layout → render
- [ ] E2E test: paste code → see diagram
- [ ] Visual regression tests (output SVG matches spec)

---

## References

- **IEEE 91-1984**: Standard logic symbols for digital diagrams
- **ELK Documentation**: https://www.eclipse.org/elk/
- **D3.js**: https://d3js.org/
- **Roadmap**: See ROADMAP.md Phase 1.1
