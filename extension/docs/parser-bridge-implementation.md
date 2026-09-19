# Parser Bridge Implementation (Ticket #10)

## Overview

This document describes the implementation of the Parser CLI subprocess bridge for the SchemaTeX VSCode extension. The ParserBridge class enables the extension to spawn the SystemVerilog parser as a subprocess, capture JSON AST output, and return it as TypeScript objects.

## Files Created/Modified

### New Files

1. **extension/src/types/ast.ts**
   - Defines TypeScript interfaces for the AST nodes
   - Matches the C++ AST structure from parser/include/ast.h
   - Exported types: `Module`, `Port`, `Signal`, `Instance`, `Assignment`, `Block`, `ASTNode`, `ParserOutput`

2. **extension/src/parser-bridge.ts** (Complete implementation)
   - `ParserBridge` class that manages subprocess communication
   - `parseFile(filePath: string): Promise<ParserOutput>` - Main parsing method
   - Platform detection for Windows/macOS/Linux
   - Timeout handling (5 second default)
   - Error handling and JSON parsing

3. **extension/bin/{platform}/schematex-parser**
   - Placeholder parser binaries for testing:
     - `win32/schematex-parser.js` - Node.js wrapper for Windows
     - `win32/schematex-parser.bat` - Batch script for Windows
     - `darwin/schematex-parser` - Node.js wrapper for macOS
     - `linux/schematex-parser` - Node.js wrapper for Linux

4. **extension/src/test/parser-bridge.test.ts**
   - Comprehensive unit tests for ParserBridge
   - Tests for valid parsing, AST structure, metadata, error handling
   - Tests for edge cases (missing files, empty files, timeout)

5. **extension/src/test/suite/index.ts**
   - Test runner configuration for Mocha

### Modified Files

1. **extension/src/extension.ts**
   - Updated imports to use ParserOutput from types/ast.ts
   - Updated showDiagram command to handle errors thrown by parseFile
   - Updated simplifyWithAI command to properly handle subprocess errors

## Architecture

### ParserBridge Class

The `ParserBridge` class is responsible for:

1. **Platform Detection**: Identifies the current OS (Windows/macOS/Linux) and locates the appropriate parser binary
2. **Binary Resolution**: Looks for compiled .exe/.binary files first, falls back to Node.js wrapper scripts
3. **Subprocess Management**: Spawns the parser process and manages its lifecycle
4. **Output Capture**: Captures stdout (JSON) and stderr (errors) from the parser
5. **Timeout Management**: Enforces a 5-second timeout to prevent hanging processes
6. **JSON Parsing**: Parses the parser's JSON output into TypeScript objects

### Platform-Specific Binaries

The implementation supports three platforms:

- **Windows (win32)**: 
  - Primary: `extension/bin/win32/schematex-parser.exe`
  - Fallback: `extension/bin/win32/schematex-parser.js` (Node.js wrapper)
  - Also included: `schematex-parser.bat` for batch execution

- **macOS (darwin)**:
  - Primary: `extension/bin/darwin/schematex-parser` (compiled binary)
  - Fallback: `extension/bin/darwin/schematex-parser.js` (Node.js wrapper)

- **Linux**:
  - Primary: `extension/bin/linux/schematex-parser` (compiled binary)
  - Fallback: `extension/bin/linux/schematex-parser.js` (Node.js wrapper)

### Placeholder Parser Binaries

For testing and development, placeholder parser binaries are included that:
- Read the input .sv file
- Return a sample AST structure as JSON
- Support the same command-line interface as the actual parser
- Can be replaced with actual compiled C++ binaries

## Usage

```typescript
import { ParserBridge } from './parser-bridge';
import { ParserOutput } from './types/ast';

const bridge = new ParserBridge();

try {
  const output: ParserOutput = await bridge.parseFile('/path/to/file.sv');
  
  // Access the AST
  console.log(output.module.name);
  console.log(output.module.ports);
  console.log(output.metadata.parseTime);
} catch (error) {
  console.error(`Parsing failed: ${error.message}`);
}
```

## Error Handling

The implementation handles the following error scenarios:

1. **File Not Found**: Throws error before spawning parser
2. **Binary Not Found**: Throws helpful error indicating where to find/place the binary
3. **Parser Timeout**: Kills the process and throws timeout error
4. **Invalid JSON Output**: Throws error indicating JSON parse failure
5. **Parser Exit Errors**: Captures stderr and reports parser-specific errors
6. **Subprocess Spawn Failure**: Throws error with failure reason

## AST Type Structure

The TypeScript interfaces in `types/ast.ts` define the following structure:

```typescript
interface ParserOutput {
  module: Module;
  metadata?: {
    fileName?: string;
    parseTime?: number;
    errorCount?: number;
  };
}

interface Module {
  type: 'module';
  name: string;
  ports: Port[];
  signals: Signal[];
  instances: Instance[];
  statements: ASTNode[];
}

interface Port {
  type: 'port';
  name: string;
  direction: 'INPUT' | 'OUTPUT' | 'INOUT';
  width: number;
}

interface Signal {
  type: 'signal';
  name: string;
  signalType: 'WIRE' | 'REG' | 'INTEGER' | 'LOGIC';
  width: number;
}

// ... more types defined in types/ast.ts
```

## Testing

Run the tests with:
```bash
npm test
```

Tests cover:
- Successful parsing of valid SystemVerilog files
- Correct AST structure and metadata
- Error handling for missing files
- Error handling for empty files
- Timeout handling
- Process termination

## Integration with Extension

The ParserBridge is integrated into the extension as follows:

1. **Initialization**: Created in `activate()` function
2. **Show Diagram Command**: Calls `parseFile()` and sends AST to webview
3. **Simplify Command**: Calls `parseFile()` and passes AST to Claude API
4. **Error Reporting**: Errors are shown in VSCode notification panel

## Future Improvements

1. **Actual C++ Parser Integration**: Replace Node.js wrapper scripts with actual compiled C++ binaries
2. **Incremental Parsing**: Implement caching to avoid re-parsing unchanged files
3. **Concurrent Parsing**: Support parsing multiple files simultaneously
4. **Performance Metrics**: Track parser performance and report bottlenecks
5. **Advanced Error Recovery**: Implement partial parsing for files with syntax errors
6. **File Watching**: Integrate with file system watcher (Ticket #11)

## Acceptance Criteria Status

- [x] Parser binary can be invoked as subprocess
- [x] JSON output captured and parsed
- [x] AST object returned to extension
- [x] Platform detection works (Windows/macOS/Linux)
- [x] Error handling graceful (no crashes)
- [x] Timeout prevents hanging processes
- [x] TypeScript types match parser output
- [x] Ready for file watcher (#11)
