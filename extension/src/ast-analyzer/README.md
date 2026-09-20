# AST Analyzer

Deterministic analysis tools for the SystemVerilog AST produced by the C++ parser.

## Components

### BlockTypeDetector

Classifies modules into one of 6 architectural types based on AST structure:

- **HIERARCHICAL**: Module contains instances but no logic blocks
- **COMBINATIONAL**: Module contains only combinational logic (always_comb, assign)
- **SEQUENTIAL**: Module contains sequential logic (always_ff blocks)
- **STATE_MACHINE**: Module is a finite state machine (always_ff + state register + transitions)
- **MEMORY**: Module uses array signals with read/write patterns
- **MIXED**: Module contains both instances and logic blocks

#### Usage

```typescript
import { detectBlockType, BlockType } from './block-type-detector';

const module = parseModule('design.sv');
const type = detectBlockType(module);

if (type === BlockType.STATE_MACHINE) {
  // Apply FSM-specific rendering or analysis
}
```

#### Detection Rules

The detector applies deterministic rules in this order:

1. **HIERARCHICAL**: `instances.length > 0 && blocks.length === 0`
2. **MIXED**: `instances.length > 0 && blocks.length > 0`
3. **COMBINATIONAL**: All blocks are `always_comb` or `assign`
4. **STATE_MACHINE**: Has `always_ff` + state signal (matching naming patterns) + state usage in blocks
5. **MEMORY**: Has array signals (`isArray: true`) with read/write patterns in blocks
6. **SEQUENTIAL**: Has `always_ff` blocks (default for sequential)

#### Implementation Details

- **State Detection**: Looks for signals with names containing "state", "state_reg", "current_state", or "next_state"
- **Memory Detection**: Identifies array signals and checks if they're used in block inputs/outputs
- **Deterministic**: No LLM involvement; all classifications are based on syntactic patterns
- **Best-Practices Assumption**: Detects common naming conventions and patterns used in well-written RTL

#### Testing

Comprehensive test suite covers:
- 2-to-4 decoder (COMBINATIONAL)
- 4-bit counter (SEQUENTIAL)
- Processor with hierarchy (HIERARCHICAL)
- Traffic light FSM (STATE_MACHINE)
- Single-port RAM (MEMORY)
- Mixed hierarchy + logic (MIXED)
- Edge cases (empty modules, assign-only, naming variations)

Run tests:
```bash
npm test
```

## Future Enhancements

- Support for generate blocks
- More sophisticated state machine detection (case statements)
- Parameter-based type detection
- Module interface analysis
