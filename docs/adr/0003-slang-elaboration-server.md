# ADR 0003: Replace the Hand-Written Parser with slang Behind a Python Server

## Status
Accepted. Supersedes [ADR 0001](0001-parser-renderer-cli-separation.md).

## Context

The original C++ parser (lexer → parser → AST → JSON) was written from scratch for a subset of SystemVerilog. In practice it:

- hung on modules containing instances (worked around with a 10 s timeout and a mock fallback);
- had no elaboration: parameters, generate loops and hierarchical port connections were not resolved;
- silently accepted illegal code (e.g. procedural assignment to a `wire` in `examples/processor.sv`);
- was glued to the web app by a Node server that was deleted in commit a270354, leaving the app unable to render at all.

Writing a correct SystemVerilog front end is a multi-year effort. Mature open-source ones exist.

**Alternatives considered:**
1. **Fix the hand-written parser.** Doesn't address elaboration, and every new language feature is more work.
2. **Verible or tree-sitter-verilog.** Good syntax trees, but no elaboration, so hierarchy, parameters and connectivity would still have to be written by hand.
3. **Yosys + netlistsvg.** Synthesises to gates and flip-flops, so the RTL-level view (`always_ff` blocks, module boxes, FSMs) is lost.
4. **slang** (via its `pyslang` Python bindings). A complete, IEEE 1800-2017-compliant compiler front end with full elaboration, precise diagnostics, and wheels on PyPI.

## Decision

Use **slang** through **pyslang**, wrapped in a small **FastAPI** server (`server/`). The server elaborates the source and returns the full instance tree. For each instance it returns ports, signals, logic blocks (with the signals each block reads, writes and is clocked by) and child instances (with the parent signals bound to each port).

Everything visual moves into the browser. Module classification (`web/src/lib/classify.ts`), graph construction (`graph.ts`), ELK layout (`layout.ts`) and D3 rendering (`D3Canvas.tsx`) all run client-side.

```
SystemVerilog ──POST /api/parse──▶ server/ (pyslang: parse + elaborate) ──JSON──▶ web/ (classify → graph → ELK → D3)
```

## Rationale

1. **Correctness.** slang handles the whole language and reports real errors with line and column. The diagram can only be as right as the front end.
2. **Elaboration.** Parameter values, generate loops and per-instance port widths come for free, which the diagram needs.
3. **Determinism preserved.** slang is a compiler, not a heuristic. ADR 0002's "no guessing in the core pipeline" still holds.
4. **Thin backend.** The server does one thing (source → elaborated JSON). Layout lives next to rendering, so visual changes don't touch the backend.
5. **Speed.** `processor.sv`, which hung the old parser, elaborates in about 10 ms.

## Consequences

**Positive:**
- Removes about 1,700 lines of C++ plus build tooling and committed binaries.
- The JSON contract is defined by `server/schematex/extract.py` and mirrored in `web/src/types/index.ts`. Both are covered by tests (`server/tests`, `web/src/lib/graph.test.ts`).
- `python -m schematex file.sv` gives the same inspectable CLI output ADR 0001 valued.

**Negative:**
- Adds a Python runtime dependency. Development needs Python 3.10+ and Node.
- Pinned to pyslang's Python API, which has changed between major versions (v12 moved classes into `pyslang.ast` / `pyslang.syntax`). The version is pinned in `server/requirements.txt`.
- The web app needs the server running. It can no longer render from a static page alone.
