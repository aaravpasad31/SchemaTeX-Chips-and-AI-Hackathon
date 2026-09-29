# SchemaTeX

**Interactive schematics from SystemVerilog RTL.**

Paste or pick a design and SchemaTeX draws it as a block diagram: module ports on the edges, logic blocks and child instances as boxes, and every net routed between them. Double-click an instance to open it; click a wire to trace its net.

## Features

- **Real SystemVerilog front end.** Designs are parsed and elaborated by [slang](https://github.com/MikePopoloski/slang), so parameters, generate loops and hierarchy are resolved exactly as a compiler would, and errors are reported with line and column.
- **Deterministic.** The diagram comes from the elaborated design, with no guessing (see [ADR 0002](docs/adr/0002-deterministic-parser-with-claude-abstraction.md)).
- **Block type detection.** Modules are classified as hierarchical, mixed, state machine, memory, sequential or combinational.
- **Interactive.** Zoom and pan, drill into instances with breadcrumbs back up, click-to-trace nets, clock and reset wires colour-coded, bus widths labelled.

## Quick start

Requires Python 3.10+ and Node 18+.

```bash
make setup   # create server/.venv and install web/node_modules
make dev     # API on :3001, web app on http://localhost:3000
```

Or run the two halves yourself:

```bash
# Terminal 1: API server
cd server
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app:app --port 3001

# Terminal 2: web app (proxies /api to the server)
cd web
npm install
npm run dev
```

Set `SCHEMATEX_API=http://host:port` before `npm run dev` to point the web app at a server on another port.

## How it works

```
SystemVerilog ──POST /api/parse──▶ server/  ──JSON──▶ web/
                                   slang: parse       classify → build graph → ELK layout → D3 render
                                   + elaborate
```

1. **Elaborate** (`server/schematex/extract.py`). pyslang compiles the source and walks the instance tree. For each instance it records ports, internal signals, logic blocks (the signals each `always_*`/`assign` reads, writes and is clocked by) and child instances with the parent signals bound to each port.
2. **Classify** (`web/src/lib/classify.ts`). Each module gets one of the six block types.
3. **Build graph** (`web/src/lib/graph.ts`). For the level being viewed, ports, blocks and instances become nodes, and each net becomes edges from its drivers to its sinks.
4. **Lay out** (`web/src/lib/layout.ts`). ELK's layered algorithm places nodes left-to-right and routes wires orthogonally.
5. **Render** (`web/src/components/D3Canvas.tsx`). D3 draws the SVG and handles zoom, selection and drill-down.

To inspect the JSON for any file directly:

```bash
cd server && .venv/bin/python -m schematex ../examples/processor.sv
```

## Project structure

```
├── server/                 # Python API: slang elaboration → JSON
│   ├── schematex/          # extract.py (the core), CLI entry point
│   ├── app.py              # FastAPI app: POST /api/parse
│   └── tests/
├── web/                    # React + TypeScript + D3 front end
│   └── src/
│       ├── components/     # Editor, Diagram panel, D3Canvas
│       ├── lib/            # api, classify, graph, layout (+ tests)
│       ├── types/          # Mirrors the server's JSON
│       └── utils/          # Example loader
├── examples/               # Sample designs, also loaded by the web app
├── tests/designs/          # Design test suite with expectations, used by both test suites
└── docs/adr/               # Architecture decision records
```

## Development

```bash
make test                   # both suites
cd server && .venv/bin/pytest
cd web && npm test && npm run build
```

`tests/designs/` holds 63 SystemVerilog designs (combinational, sequential, FSMs, memories, hierarchy, language features, stress tests and deliberate errors). Each file states its expected module type, wires and diagnostics in `// @expect-*` comments, and both suites check every file (see [tests/designs/README.md](tests/designs/README.md)). The designs also appear under "Test suite" in the web app's example picker.

The web unit tests use real server output stored in `web/src/lib/__fixtures__/`. After changing the extractor, regenerate them with `make fixtures`.

## Examples

| File | Shows |
|------|-------|
| `counter_4bit.sv` | Sequential logic with clocked and combinational blocks |
| `mux_4to1.sv` | Pure combinational logic |
| `traffic_light.sv` | Enum-based state machine |
| `counter_chain.sv` | Hierarchy with bit-select connections (ripple clocking) |
| `shift_register.sv` | Parameters and a generate loop |
| `processor.sv` | Mixed hierarchy with memory and cache controllers |

## Roadmap

- Show instances of undefined modules as black boxes
- Show where an error is in the editor (highlight the line)
- Export to SVG/PNG
- Collapse large nets and bus rippers for big designs
- Optional Claude-assisted "Simplify" view ([ADR 0002](docs/adr/0002-deterministic-parser-with-claude-abstraction.md))

See [CONTEXT.md](CONTEXT.md) for the domain model and design decisions.
