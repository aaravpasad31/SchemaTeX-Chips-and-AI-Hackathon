# SchemaTeX Roadmap: Production-Quality Diagrams

**Goal:** Generate hardware schematics as complex as real RTL designs (read commit images).

**Current State:** Simple box diagrams with basic parsing  
**Target State:** Professional hierarchical diagrams with automatic layout

---

## Phase 1: Parser Enhancements (CRITICAL)

### 1.1 Module Instantiation Parsing
**Status:** Partial  
**Required:** Parse and extract module instances correctly

```systemverilog
module processor (input clk, output valid);
  memory_controller mem_ctrl (.clk(clk), .addr(addr_bus));
  alu arithmetic (.a(a_bus), .b(b_bus), .result(alu_out));
endmodule
```

**Parser must extract:**
- Instance name: `mem_ctrl`
- Module type: `memory_controller`
- Port connections: `.clk(clk)` → signal mapping
- Repeat for all instances

**Output AST should include:**
```json
{
  "modules": [{
    "name": "processor",
    "instances": [
      {
        "name": "mem_ctrl",
        "module_type": "memory_controller",
        "port_map": [
          {"instance_port": "clk", "signal": "clk"},
          {"instance_port": "addr", "signal": "addr_bus"}
        ]
      }
    ]
  }]
}
```

**Files to modify:**
- `parser/src/parser.cpp` - parseInstance() function
- `parser/include/parser.h` - add Instance struct
- `extension/src/types/ast.ts` - update AST types

**Test case:** `examples/hierarchical.sv` (already in repo)

---

### 1.2 Generate Block Support
**Status:** Not implemented  
**Required:** Parse and elaborate generate blocks

```systemverilog
module bank (input [7:0] addr);
  generate
    for (genvar i = 0; i < 8; i = i + 1) begin : memory_row
      cache_line line_i (.addr(addr[i]));
    end
  endgenerate
endmodule
```

**Parser must:**
- Detect generate blocks
- Unroll loops (with small limits: max 16 iterations)
- Create instance for each generated item
- Track loop variable in naming

**Output:**
```json
{
  "instances": [
    {"name": "memory_row[0]", "module_type": "cache_line"},
    {"name": "memory_row[1]", "module_type": "cache_line"},
    ...
  ]
}
```

**Files to modify:**
- `parser/src/parser.cpp` - parseGenerateBlock()
- `parser/include/parser.h` - add GenerateBlock struct

**Test case:** Create `examples/cache_bank.sv` with 4-8 generated instances

---

### 1.3 Parameterized Modules
**Status:** Not implemented  
**Required:** Extract parameters and their values at instantiation

```systemverilog
module fifo #(parameter DEPTH = 16, WIDTH = 32);
  // ...
endmodule

fifo #(.DEPTH(32), .WIDTH(64)) fifo_inst (...);
```

**Parser must:**
- Extract module parameters: `#(parameter ...)`
- Extract instantiation overrides: `#(.DEPTH(32))`
- Track which instance has which parameter values

**Output:**
```json
{
  "modules": [{
    "name": "fifo",
    "parameters": [
      {"name": "DEPTH", "default": "16", "instantiation": "32"}
    ]
  }]
}
```

**Files to modify:**
- `parser/src/parser.cpp` - parseModule() and parseInstance()
- `parser/include/parser.h` - add Parameter struct

---

## Phase 2: Renderer/Layout Integration (HIGH PRIORITY)

### 2.1 Use ELK Layout Engine
**Status:** Code exists but not integrated into web app  
**Required:** Convert hierarchy AST → positioned diagram

You have `extension/src/webview/layout-engine.ts` (497 lines) but it's not being used.

**Action:**
1. Extract ELK layout logic from extension
2. Adapt to work with web app JSON AST
3. Input: hierarchical instances
4. Output: x, y positions for each instance/port

**Files involved:**
- `extension/src/webview/layout-engine.ts` - reference implementation
- `prototype-tester/frontend.html` - integrate layout calls

**Test:** Counter with 2-3 nested modules should position correctly

---

### 2.2 Hierarchical Box Rendering
**Status:** Simple boxes only  
**Required:** Nested boxes showing module hierarchy

```
┌─ processor ────────────────────┐
│ ┌─ mem_ctrl ────────┐          │
│ │ [ports + logic]   │          │
│ └───────────────────┘          │
│ ┌─ alu ─────────────┐          │
│ │ [ports + logic]   │          │
│ └───────────────────┘          │
└────────────────────────────────┘
```

**Action:**
1. Detect nesting in AST
2. Draw parent box
3. Draw child boxes inside
4. Position ports relative to parent

**Files:**
- `prototype-tester/frontend.html` - renderDiagramSVG() function
- May create `prototype-tester/diagram-renderer.js`

---

### 2.3 Wire Routing Between Instances
**Status:** Not implemented  
**Required:** Draw wires connecting instance ports

For each signal connection:
- Find source port (which instance outputs it)
- Find destination port (which instance inputs it)
- Draw curved/straight line between them
- Label with signal name

**Algorithm:**
1. Parse all connections from AST
2. Calculate path from source → destination
3. Avoid overlaps with other wires
4. Render as SVG `<path>`

**Files:**
- `prototype-tester/frontend.html` - add wireRouting() function

---

## Phase 3: Polish & Edge Cases

### 3.1 Port Labels
Show bit-widths: `[7:0]`, `[31:16]`, etc.

### 3.2 Collapsible Hierarchy
Click to expand/collapse instances

### 3.3 Error Handling
Show gray boxes with "❌ Parse Error" for unparseable sections

---

## Testing Strategy

### Test Cases (in order of complexity)

1. **Basic Counter** ✅ (already works)
   ```systemverilog
   module counter (input clk, output [3:0] count);
   ```

2. **Simple Hierarchy** (2 modules, 1 instance)
   ```systemverilog
   module top (input clk);
     counter c1 (.clk(clk));
   endmodule
   ```

3. **Multiple Instances** (3-4 instances)
   ```systemverilog
   module processor (input clk);
     memory mem (.clk(clk));
     alu alu1 (.clk(clk));
     cache cache1 (.clk(clk));
   endmodule
   ```

4. **Generated Instances** (simple loop)
   ```systemverilog
   module bank (input [7:0] addr);
     generate
       for (genvar i = 0; i < 4; i = i + 1) begin
         line line_i (.addr(addr[i]));
       end
     endgenerate
   endmodule
   ```

5. **Parameterized Modules** (with overrides)
   ```systemverilog
   fifo #(.DEPTH(32)) f1 (...);
   fifo #(.DEPTH(64)) f2 (...);
   ```

6. **Complex Hierarchy** (3+ levels)
   Real design with nested modules

### Run Tests
```bash
# Test parser on each example
./parser/schematex-parser examples/hierarchical.sv | jq .

# Test web app
npm start --prefix prototype-tester
# Paste code, should see hierarchical diagram
```

---

## Priority Order

| Task | Priority | Est. Time | Blocks |
|------|----------|-----------|--------|
| Parse module instances | 🔴 CRITICAL | 2-3 hrs | Everything else |
| Hierarchical box rendering | 🔴 CRITICAL | 1-2 hrs | Wire routing |
| Wire routing | 🟠 HIGH | 2-3 hrs | Polish |
| Generate blocks | 🟠 HIGH | 2-3 hrs | Complex designs |
| ELK layout integration | 🟡 MEDIUM | 1-2 hrs | Automatic positioning |
| Parameter support | 🟡 MEDIUM | 1-2 hrs | Parameterized modules |
| Port labels | 🟢 LOW | 1 hr | Polish |
| Collapsible hierarchy | 🟢 LOW | 1-2 hrs | UX |

---

## Running Sessions

### Session 1: Parser Instance Parsing
```bash
# Focus: Make parser extract module instances correctly
claude
> I need to enhance the SystemVerilog parser to correctly parse and extract
> module instantiation statements. See ROADMAP.md Phase 1.1. Current parser
> only partially handles instances. I need the AST to include all instances
> with their port mappings.
```

### Session 2: Hierarchy Rendering
```bash
# Focus: Render nested boxes for module hierarchy
claude
> The parser now extracts instances correctly. I need to enhance the web app
> diagram renderer to show hierarchical boxes (parent module containing child
> instances). See ROADMAP.md Phase 2.2.
```

### Session 3: Wire Routing
```bash
# Focus: Draw wires connecting instance ports
claude
> Hierarchy is rendering correctly. Now I need wire routing to show signal
> connections between instances. See ROADMAP.md Phase 2.3.
```

---

## Success Criteria

✅ **Phase 1 Complete:** Parser correctly handles hierarchical designs up to 2-3 levels  
✅ **Phase 2 Complete:** Web app renders hierarchical diagrams with wires  
✅ **Phase 3 Complete:** Diagrams match quality of professional schematics  

**End Goal:** Paste the diagram from the image as .sv code → SchemaTeX renders it perfectly
