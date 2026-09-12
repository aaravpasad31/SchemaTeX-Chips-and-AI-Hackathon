# ADR 0002: Deterministic Parser with Claude-Assisted Abstraction Inference

## Status
Accepted

## Context

SchemaTeX's core value proposition is **verifiable correctness**. A diagram must match the code, not a model's interpretation. However, SystemVerilog contains complex patterns (deeply nested always blocks, parameterized generate loops, intricate conditional logic) that are hard to visualize clearly.

**Alternatives considered:**
1. **LLM for all parsing** — Fast feature delivery, but sacrifices verifiability. Diagrams become unreliable.
2. **Deterministic parser only, no abstraction** — Verifiable but produces cluttered, hard-to-read diagrams for complex code.
3. **Hybrid: deterministic parser + optional Claude abstraction** — Keeps core accurate, allows human-in-the-loop simplification for complex patterns.

## Decision

**Deterministic parser** generates the diagram directly from parsed RTL. Claude is invoked *only* when the user requests abstraction via a "Simplify" button. Claude infers what the complex logic represents at a higher level; the user reviews and approves before the abstraction is visualized.

```
.sv file
    ↓
C++ Parser (deterministic, no LLM)
    ↓
JSON AST + Diagram (1:1 with code)
    ↓
User clicks "Simplify" (optional)
    ↓
VSCode Extension → Claude API (with AST)
    ↓
Claude: "This looks like a FIFO, here's a simplified view..."
    ↓
User approves or rejects
    ↓
Simplified Diagram (layered over original)
```

## Rationale

1. **Verifiability**: The base diagram is always correct—generated deterministically from parsed code. Accuracy is not a matter of opinion.
2. **Performance**: No LLM latency on every file save. Diagram regenerates instantly as code changes.
3. **Transparency**: Users see exactly what the parser understands. No "black box" judgment calls.
4. **Optional Enhancement**: Claude is a power tool for complex designs, not a necessity. Simple designs render perfectly without it.
5. **Cost**: Claude calls only on user request, not on every parse. Reduces API spend.

## Consequences

**Positive:**
- Diagrams are ground-truth representations of the code.
- Fast feedback loop (no LLM latency on every save).
- Complies with "diagram output is checked against parsed RTL structure" from the spec.
- Users can work with complex code if needed; Claude is available on demand.

**Negative:**
- Complex code still produces complex diagrams initially (before user hits Simplify).
- Claude abstraction inference requires users to have Claude API keys.
- No automatic abstraction; users must request it explicitly.

## Implementation Notes

- V1: Abstraction inference is user-triggered only (future: consider auto-abstraction for >1000-line modules).
- Claude receives the AST (not the raw code) and context ("What are the high-level blocks here?").
- Simplified abstractions are stored as annotations in extension state, not written to the .sv file.
- Users can toggle between raw and simplified views.
