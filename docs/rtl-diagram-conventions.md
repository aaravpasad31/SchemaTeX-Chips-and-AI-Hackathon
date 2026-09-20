# RTL Diagram Visual Conventions: Research Summary

Comprehensive research into how Register Transfer Level (RTL) diagrams are designed and represented in industry-standard tools, academic literature, and open-source visualization frameworks.

---

## 1. Standards and Regulatory Framework

### IEEE Standard 91/91a: Graphic Symbols for Logic Functions

[IEEE Standard 91-1984](https://www.ti.com/lit/ml/sdyz001a/sdyz001a.pdf) (combined with [ANSI/IEEE Std 91a-1991](http://rfc.nop.hu/ieee2/IEEE%20Std%2091a-1991.pdf)) establishes an international language for representing logic functions and devices in diagram form:

- **Purpose**: Enable understanding of logic characteristics without requiring specific internal knowledge
- **Scope**: Provides qualifying symbols for inputs, outputs, connections, dependency notation, combinational and sequential elements
- **Status**: Inactivated without replacement as of November 7, 2019, but remains foundational to digital logic diagram conventions
- **Content**: Includes comprehensive visual symbol definitions for logic gates, functional blocks, and interconnection rules

**Key insight**: While the IEEE standard is officially deprecated, its conventions remain the industry baseline for how logic components are visually represented.

---

## 2. Component and Block Representation

### Block Types and Visual Distinction

In RTL diagrams, different module types require visual distinction:

- **Logic Blocks**: Combinational or sequential logic (rectangles, colored by function)
- **Module Instances**: Instances of sub-modules within a hierarchical container (blue-shaded boxes in Vivado)
- **Hierarchical Containers**: Parent modules that contain child instances (larger bordered rectangles)
- **Ports**: Module interfaces positioned on container edges (circles or small markers)
- **Memory Blocks**: Visually distinguished from logic (often with pattern fill or distinct color)
- **State Machines**: Sometimes represented with distinct shapes (ellipses vs. rectangles)

Sources:
- [Vivado IP Integrator Documentation - Working with Block Designs](https://docs.amd.com/r/en-US/ug994-vivado-ip-subsystems/Working-with-Block-Designs)
- [RTL Synthesis Course Material - WPI ECE574](https://schaumont.dyn.wpi.edu/ece574f24/04synthesis.html)

### Graphviz Node Shapes

[Graphviz](https://graphviz.org/doc/info/shapes.html) provides polygon-based node shapes commonly used in RTL visualization tools:

- **Basic shapes**: box, ellipse, circle, diamond, polygon
- **Specialized shapes**: triangle, pentagon, hexagon, octagon
- **Shape configuration**: Controlled via `shape` attribute (e.g., `node [shape=box]`)
- **Appearance control**: Influenced by attributes: `fixedsize`, `fontname`, `fontsize`, `height`, `label`, `style`, `width`

Graphviz note: Logic-specific shapes aren't built-in; circuit designs adapt existing shapes for their purposes.

---

## 3. Wire and Connection Representation

### Bus vs. Single-Wire Distinction

[Vivado Block Diagram conventions](https://docs.amd.com/r/en-US/ug994-vivado-ip-subsystems/Block-Diagram-Addressing-View):
- **Buses**: Shown as **bold lines** (thick strokes)
- **Single wires**: Shown as **thin black lines**
- **Visual encoding**: Line thickness directly indicates signal width
- **Connection representation**: Signal/bus-level connections are narrow connection lines on symbols

### Bus Width Notation

[Digital Logic Fundamentals (UPenn CIS5710)](https://www.cis.upenn.edu/~cis5710/spring2024/slides/03_systemverilog.pdf) and [System Bus Design (GeeksforGeeks)](https://www.geeksforgeeks.com/system-bus-design/):
- Buses carry multi-bit data (e.g., D[7:0] for 8-bit data bus)
- Bus width is typically labeled on the wire or in the signal name
- Standard notation: `[width-1:0]` indicates bit range (e.g., `[31:0]` for 32-bit bus)
- Width determination correlates with CPU performance and system architecture

### Signal Conventions

- Higher voltage = logic 1
- Lower voltage = logic 0
- Z = high impedance
- Colors commonly used to distinguish signal types (blue for CLK, red for data, etc.)

---

## 4. Port Positioning and Labeling Conventions

### Industry Standard Port Placement

[Schematic symbol standards](https://ultralibrarian.com/2025/07/15/schematic-symbol-for-integrated-circuit) and [block diagram layout research](https://www.sciencedirect.com/science/article/abs/pii/S0925772122000293):

**Typical layout follows left-to-right signal flow**:
- **Left side**: Input ports
- **Right side**: Output ports and general-purpose I/O
- **Top**: Power supply connections (VCC, AVCC)
- **Bottom**: Ground returns (GND, AREF)

**Rationale**: 
- Matches natural signal flow direction (left → right)
- Power/ground separation follows schematic best practices
- Improves readability and reduces cognitive load

### Port Labeling

[Syncfusion Diagram SDK documentation](https://help.syncfusion.com/diagram-sdk/react/ports-positioning):
- Ports are identified by directional notation: top (t), bottom (b), left (l), right (r)
- Labels should be positioned outside the box for clarity
- Font sizing typically smaller than block labels (10px vs. 12-14px)

---

## 5. Hierarchical Representation

### Nested Module Visualization

[Hierarchical RTL design patterns](https://www.researchgate.net/figure/An-example-of-hierarchical-RTL-design_fig2_221594719) from academic research:

- **Child modules rendered inside parent**: Every instance within a module is visually contained
- **Container sizing**: Often derived from metrics (line count, register count, or instance count)
- **Visual separation**: Border around container distinguishes parent from children
- **Port markers on edges**: Container's ports shown as circles on the container's perimeter
- **Cross-hierarchy edges**: Wires connecting siblings to parents clearly routed

### SystemVerilog Hierarchy Best Practices

[ASIC-World SystemVerilog Hierarchy documentation](https://www.asic-world.com/systemverilog/hierarchy1.html) and [Bluespec training materials](https://web.ece.ucsb.edu/its/bluespec/training/BSV/slides/Lec04_Module_Hierarchy.pdf):

- **Module definitions**: All modules defined at top level (no nested definitions)
- **Hierarchical naming**: Dot-notation used to access child scopes (e.g., `parent.child`)
- **Benefits**: Enhanced modularity, reusability, focused debugging at module level

---

## 6. Layout Conventions and Spacing

### ELK (Eclipse Layout Kernel) Hierarchical Layout

[ELK Layered Layout Algorithm](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) implements the Sugiyama method (1981) for hierarchical diagrams:

**Core principle**: "Emphasize the direction of edges by pointing as many edges as possible into the same direction"

**Default spacing values**:
```
- Node-to-node spacing: 20 units
- Node-to-node between layers: 20 units
- Edge-to-node between layers: 10 units
- Component spacing: 20 units
```

**Edge routing styles**: Straight, orthogonal (default), splines

**Crossing minimization**:
- Layer sweep strategy with greedy switching heuristics
- Configurable thresholds for crossing reduction
- Port constraints respected for accurate block diagram layout
- Support for compound graphs with cross-hierarchy edges

**Key feature**: Multi-edges and edge labels fully supported with automatic positioning.

[Full ELK Layout Options Reference](https://eclipse.dev/elk/reference/options.html) provides granular control over:
- Individual spacing overrides
- Label positioning (nodes, edges, ports)
- Layer distance and spacing factors
- Port side constraints

### Recommended Spacing for RTL Diagrams

Based on ELK conventions and industry practice:
- **Minimum node-node spacing**: 40-80 units (for visual clarity)
- **Container padding**: 40 units on all sides
- **Port margin from edge**: 8-16 units
- **Label offset from node**: 10-20 units

**Rationale**: Prevents overlapping labels, enables easy clicking/selection, maintains visual hierarchy.

---

## 7. Signal Types and Special Representations

### Clock Signals

[Intel Quartus RTL Design Guidelines](https://www.intel.com/content/www/us/en/docs/programmable/683846/21-4/rtl-reset-and-clock-signals.html) and [Clock Timing Diagram Standards](https://completeera.com/clock-timing-diagram-how-to-draw-it-for-circuit-analysis/):

- **Timing diagram representation**: Perfect squares in ideal diagrams; small slopes added in realistic representations
- **Minimum cycles shown**: 2-3 clock cycles to illustrate timing relationships
- **Naming convention**: Clock signals commonly named CLK, clk, clock, or clock_in
- **Visual encoding**: Often colored distinctly (e.g., blue) for rapid identification
- **Schematic symbol**: May use special marking (clock symbol with triangle or arrow)

### Reset Signals

[RTL Reset Conventions](https://www.intel.com/content/www/us/en/docs/programmable/683846/21-4/rtl-reset-and-clock-signals.html):

- **Types**: Asynchronous reset (fast, no clock needed) and synchronous reset (glitch-free)
- **Naming**: Source module letter + "reset" (e.g., `core_reset`, `sys_reset`)
- **Visual representation**: Typically shown as separate lines from clock signals
- **Best practice**: Consistent naming across all tools for easy identification

---

## 8. Color and Visual Distinction

### Tool-Specific Color Conventions

[FPGA Design Guide - Lattice Semiconductor](https://www.latticesemi.com/-/media/LatticeSemi/Documents/UserManuals/EI/FPGADesignGuide.ashx?document_id=9762) and [Vivado block diagram documentation](https://docs.amd.com/r/en-US/ug994-vivado-ip-subsystems/Creating-a-Block-Design):

**Vivado conventions**:
- **RTL modules**: Light blue boxes (RTL on Canvas)
- **IP blocks**: Different colored boxes by type
- **Containers**: Transparent or white background with black border

**Lattice FPGA conventions**:
- **Gray shaded boxes**: PFU (Programmable Functional Units)
- **Blue colored boxes**: sysDSP blocks
- **Other elements**: Color-coded by function type

**General observation**: No universal standard exists; vendors implement their own color schemes. Best practice is to:
- Use consistent colors within a design
- Distinguish block types (logic vs. memory vs. I/O)
- Avoid color combinations that are difficult for color-blind viewers

---

## 9. Label Placement and Collision Management

### Label Overlap Prevention

[ELK Overlap Detection and Removal](https://eclipse.dev/elk/reference/options/org-eclipse-elk-graphviz-overlapMode.html) and [Fast Label Placement Research (Washington IDL)](https://idl.cs.washington.edu/files/2021-FastLabels-VIS.pdf):

**Graphviz approach**:
- Labels placed to avoid overlapping nodes and other labels
- Default: Not all labels placed if conflicts occur
- Option: `forcelabels=true` forces placement of all labels (may cause overlaps)

**ELK approach**:
- Overlap removal algorithm with configurable modes
- Edge label placement with multiple positioning strategies
- Scanline overlap checks for additional validation

**Research-backed techniques**:
- Conflict graph method: Nodes represent labels, edges represent intersections
- Occupancy bitmap: Rasterize existing marks, accelerate placement without overlaps
- Dynamic repositioning: Move labels intelligently when collisions detected

### Best Practices for RTL Diagrams

- **Instance labels**: Center inside block
- **Port labels**: Outside block, near port marker
- **Edge labels**: Above or below edge, offset to avoid crossing wires
- **Container labels**: Top-left corner or center-top
- **Minimum offset from shapes**: 4-6 pixels for visual separation

---

## 10. Yosys Open Synthesis Tool Approach

[Yosys Show Command Documentation](https://yosyshq.readthedocs.io/projects/yosys/en/0.47/cmd/show.html):

The `show` command generates RTL schematics using Graphviz:

- **Output format**: DOT files compiled to SVG or PostScript
- **Default viewer**: xdot on POSIX systems
- **Usage**: `show` generates `~/.yosys_show.dot` and graphics file
- **Custom output**: `show -format png -prefix filename` generates PNG diagrams
- **Visual approach**: Leverages Graphviz's graph layout to represent synthesized RTL structure

**Note**: Yosys documentation doesn't specify detailed visual conventions; these are inferred from Graphviz's capabilities and industry practice.

---

## 11. Practical Implementation Guidelines

### Component Library Design Recommendations

Based on research findings, a robust RTL diagram component library should implement:

1. **Configurable block shapes** with size normalization
   - Standard: 120x80 pixels (instances), 140x80 pixels (logic blocks)
   - Scalable for different zoom levels

2. **Standardized port representation**
   - 4-6 pixel circles/markers on container edges
   - Left/right positioning for inputs/outputs
   - Top/bottom for power/ground (optional)

3. **Wire rendering with bus indication**
   - Single wires: 1-2 pixel stroke
   - Buses: 3-4 pixel stroke (bold)
   - Optional: Width label on bus (e.g., "[7:0]")

4. **Hierarchical container styling**
   - Transparent or 50% opacity background
   - 2-3 pixel border
   - Padding: 40 pixels minimum
   - Title label in top-left, 14px font

5. **Label collision detection**
   - Check for overlaps before rendering
   - Implement offset repositioning algorithm
   - Fallback: Rotate label or move slightly offset from collision

6. **Layout algorithm integration**
   - Use ELK or similar hierarchical layout
   - Configure spacing: node-node: 80 units, padding: 40 units
   - Enable crossing minimization
   - Support port constraints for accurate block diagram layout

7. **Signal type differentiation**
   - Clock: Distinct color + optional marker
   - Reset: Different color + marker
   - Data: Default color with optional width label
   - Power: Top placement + special color

---

## References by Topic

### Standards
- [IEEE Std 91-1984: Graphic Symbols for Logic Functions](https://www.ti.com/lit/ml/sdyz001a/sdyz001a.pdf)
- [ANSI/IEEE Std 91a-1991 Supplement](http://rfc.nop.hu/ieee2/IEEE%20Std%2091a-1991.pdf)

### EDA Tools & Documentation
- [AMD Vivado IP Integrator User Guide (UG994)](https://www.xilinx.com/support/documents/sw_manuals/xilinx2022_1/ug994-vivado-ip-subsystems.pdf)
- [Intel Quartus RTL Design Guidelines](https://www.intel.com/content/www/us/en/docs/programmable/683846/21-4/rtl-reset-and-clock-signals.html)
- [Lattice FPGA Design Guide](https://www.latticesemi.com/-/media/LatticeSemi/Documents/UserManuals/EI/FPGADesignGuide.ashx?document_id=9762)
- [Yosys Show Command](https://yosyshq.readthedocs.io/projects/yosys/en/0.47/cmd/show.html)
- [ModelSim PE User's Manual](https://wikis.ece.iastate.edu/cpre584/images/3/3c/Modelsim_pe_user_10.0d.pdf)

### Layout Algorithms
- [ELK Layout Reference - Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html)
- [ELK Layout Options](https://eclipse.dev/elk/reference/options.html)
- [ELK Overlap Removal](https://eclipse.dev/elk/reference/options/org-eclipse-elk-graphviz-overlapMode.html)
- [ELK Edge Label Placement](https://eclipse.dev/elk/reference/options/org-eclipse-elk-edgeLabels-placement.html)
- [The Eclipse Layout Kernel (Academic Paper)](https://arxiv.org/pdf/2311.00533)

### SystemVerilog & Hardware Design
- [ASIC-World SystemVerilog Hierarchy](https://www.asic-world.com/systemverilog/hierarchy1.html)
- [Bluespec Module Hierarchy Training](https://web.ece.ucsb.edu/its/bluespec/training/BSV/slides/Lec04_Module_Hierarchy.pdf)
- [UPenn CIS5710: Digital Logic & SystemVerilog](https://www.cis.upenn.edu/~cis5710/spring2024/slides/03_systemverilog.pdf)

### Visualization & Graphing
- [Graphviz Node Shapes](https://graphviz.org/doc/info/shapes.html)
- [Syncfusion Diagram: Port Positioning](https://help.syncfusion.com/diagram-sdk/react/ports-positioning)
- [Fast Label Placement Research](https://idl.cs.washington.edu/files/2021-FastLabels-VIS.pdf)

### Academic & Specialized
- [Layered Drawing with Port Constraints (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0925772122000293)
- [Clock Timing Diagram Standards](https://completeera.com/clock-timing-diagram-how-to-draw-it-for-circuit-analysis/)
- [System Bus Design (GeeksforGeeks)](https://www.geeksforgeeks.com/system-bus-design/)

---

## Summary

Industry RTL diagram conventions converge on:

1. **IEEE 91** as the foundational logic symbol standard (though officially deprecated)
2. **Left-to-right signal flow** with inputs on left, outputs on right
3. **Bold lines for buses**, thin lines for single signals
4. **Hierarchical containment** for module nesting
5. **ELK layered layout** as the state-of-practice for algorithmic arrangement
6. **Distinct port positioning** (left/right for I/O, top/bottom for power)
7. **Vendor-specific colors** with common patterns (light blue for instances, gray for logic)
8. **Collision detection** for label placement to maintain readability
9. **Configurable spacing** (40-80 units node-node, 40 units padding recommended)

A robust component library should implement all these conventions with configurability to adapt to specific design needs.
