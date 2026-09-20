# ADR 0001: Parser and Renderer Separation via CLI Subprocess

## Status
Accepted

## Context

SchemaTeX needs to bridge SystemVerilog parsing (C++) and diagram rendering (TypeScript/React). The parser must handle complex RTL, and the renderer must produce interactive SVGs for VSCode. These are distinct domains with different performance characteristics, testing needs, and team skills.

**Alternatives considered:**
1. **Single monolith (C++ with embedded UI)** — No modularity, poor separation of concerns, hard to debug rendering independently.
2. **Native Node module (C++ bound to Node.js)** — Tighter coupling, complex build process, makes debugging harder.
3. **HTTP server (parser as microservice)** — Unnecessary overhead for a local tool, adds complexity.
4. **CLI subprocess (parser invoked as standalone process)** — Clean boundary, independent testing, platform-portable.

## Decision

The **C++ parser runs as a CLI subprocess**. The VSCode extension invokes the parser with a .sv file path, captures JSON AST output on stdout, and passes it to the TypeScript renderer.

```
VSCode Extension (TS/React)
    ↓ (spawn process)
C++ Parser CLI (reads .sv, outputs JSON)
    ↓ (stdout)
JSON AST
    ↓ (pass to renderer)
ELK Layout + SVG Rendering
    ↓
Interactive Diagram in VSCode Webview
```

## Rationale

1. **Modularity**: Parser and renderer are completely decoupled. Changes to the parser don't require rebuilding the extension.
2. **Independent Testing**: Parser can be tested in isolation with unit tests. Renderer tested separately with mock ASTs.
3. **Language Agnostic**: Parser outputs JSON, which any language can consume. Future terminal UI (Rust/ANSI) can reuse the same parser.
4. **Simple Debugging**: Each component has clear input/output. Developers can manually invoke the parser on a .sv file and inspect JSON.
5. **Distribution**: Pre-built parser binaries bundled per platform (Windows/macOS/Linux) in the extension. No platform-specific binding complexity.

## Consequences

**Positive:**
- Easy to replace parser without touching renderer.
- CLI subprocess pattern is familiar to most developers.
- Simplifies CI/CD (build parser separately, bundle binaries).

**Negative:**
- Inter-process communication overhead (negligible for typical designs <10K lines).
- Requires pre-built binaries for each platform (mitigated by GitHub Actions CI/CD).
- Error handling across process boundary must be explicit (parser exit codes, stderr).

## Implementation Notes

- Parser writes JSON to stdout; extension captures and parses.
- Parser writes errors to stderr; extension relays to VSCode Problems panel.
- Extension spawns parser with debounce (500ms) on file save to avoid thrashing.
- Pre-built binaries in `extension/bin/{platform}/parser`.
