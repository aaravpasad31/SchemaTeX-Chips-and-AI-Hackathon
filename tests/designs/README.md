# Design test suite

SystemVerilog designs that exercise SchemaTeX end to end. Both test suites run every file here:

- `server/tests/test_corpus.py` elaborates each design with slang and checks the extracted JSON.
- `web/src/lib/corpus.test.ts` builds and lays out every level of every hierarchy, and checks the connectivity expectations.

They also appear under "Test suite" in the web app's example picker.

| Folder | What it covers |
|--------|----------------|
| `combinational/` | assign, always_comb, always @(*), functions, tristate, reduction ops |
| `sequential/` | reset styles, enables, LFSR, derived clocks, latches, clock domain crossing |
| `fsm/` | Moore/Mealy, 2- and 3-process, one-hot, UART, SPI |
| `memory/` | RAMs, register file, FIFO, ROM, CAM |
| `hierarchy/` | generate loops/if/case, instance arrays, every port-connection style, parameter overrides, recursion |
| `language/` | packages, structs, interfaces, macros, tasks, assertions, testbench constructs |
| `stress/` | 36-PE mesh, 32-stage pipeline, 48-way fan-out, a small CPU |
| `errors/` | designs that must produce specific diagnostics |

## Expectations

Header comments state what each design should produce. A file without an `@expect-diagnostic` line must elaborate with no diagnostics at all.

| Annotation | Meaning | Checked by |
|------------|---------|------------|
| `@expect-type <type>` | Module type of the first top: `hierarchical`, `mixed`, `fsm`, `memory`, `sequential`, `combinational` | web |
| `@expect-instances <n>` | Total instances below the first top, at every depth | server |
| `@expect-tops <m> ...` | Exact list of top-level modules (empty for none) | server |
| `@expect-port-width <inst>.<port> <w>` | Elaborated width of a child's port | server |
| `@expect-diagnostic <severity> <line>: <text>` | A diagnostic with this severity, line and message must be reported | server |
| `@expect-net <from> -> <to>` | The top-level diagram has a wire from `from` to `to` | web |
| `@expect-no-net <from> -> <to>` | The top-level diagram has no such wire | web |

Endpoints are either a port of the top module (`clk`) or `<instance>.<port>`, where the instance name is as shown in the diagram (`g_bit[0].u_fa.cout`).
