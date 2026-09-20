# T1 — Block Type Detection

**What to build:** Implement the deterministic block type classification algorithm from SPEC.md. Parse module AST → classify into 6 types (Hierarchical, Combinational, Sequential, State Machine, Memory, Mixed).

**Blocked by:** None (foundation task)

**Acceptance criteria:**

- [ ] Function `detectBlockType(module: ModuleJSON): BlockType` implemented
- [ ] Detects HIERARCHICAL_CONTAINER: `instances.length > 0 && blocks.length == 0`
- [ ] Detects COMBINATIONAL_LOGIC: only `always_comb` blocks, no `always_ff`
- [ ] Detects SEQUENTIAL_LOGIC: `always_ff` blocks with state variables
- [ ] Detects STATE_MACHINE: enum state register + case statements on state
- [ ] Detects MEMORY_BLOCK: array declarations (`isArray: true` in signals)
- [ ] Detects MIXED_MODULE: `instances.length > 0 && blocks.length > 0`
- [ ] Falls back to UNKNOWN if ambiguous
- [ ] Works on all test cases (counter, decoder, processor, FSM, RAM)
- [ ] No console errors
- [ ] TypeScript types align with AST interfaces

**Implementation notes:**

- File: `extension/src/ast-analyzer/block-type-detector.ts`
- Input: `ModuleJSON` from parser
- Output: `BlockType` enum value
- Logic is deterministic (no LLM, no randomness)
- Handle edge cases: empty modules, single-signal modules, etc.
- Consider RTL best practices (FSMs use enum, memories use arrays, etc.)
- Add unit tests: `extension/src/test/suite/block-type-detector.test.ts`
- Test each block type with a dedicated example
