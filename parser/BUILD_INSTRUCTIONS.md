# C++ Parser Build Instructions

## The Bug (Now Fixed)

**Problem:** Parser hangs infinitely on hierarchical modules with instances.

**Root Cause:** In `parseInstance()` function (parser.cpp), when parsing port connections, if an unexpected token is encountered instead of a DOT (`.`), no token is consumed. The `while` loop continues checking the same position forever.

**Solution:** Track parser position at each loop iteration. If no progress is made (position unchanged), force advancement by one token to prevent infinite loop.

**Location:** `parser/src/parser.cpp` lines 393-433

## Building the Fixed Parser

### Option 1: Using CMake (Recommended)

```bash
cd parser
mkdir -p build
cmake -B build .
cmake --build build
cp build/schematex-parser ../  # Copy back to working directory
```

### Option 2: Direct Compilation with Clang++

```bash
cd parser
clang++ -std=c++17 -O2 \
  src/main.cpp \
  src/lexer.cpp \
  src/parser.cpp \
  src/ast.cpp \
  src/json_serializer.cpp \
  -I./include \
  -o schematex-parser-new

# Test it
./schematex-parser-new examples/processor.sv | jq '.modules[0].instances | length'
# Should output: 3

# Replace the old binary
mv schematex-parser schematex-parser.backup
mv schematex-parser-new schematex-parser
```

### Option 3: Using G++

```bash
cd parser
g++ -std=c++17 -O2 \
  src/main.cpp \
  src/lexer.cpp \
  src/parser.cpp \
  src/ast.cpp \
  src/json_serializer.cpp \
  -I./include \
  -o schematex-parser-new

mv schematex-parser schematex-parser.backup
mv schematex-parser-new schematex-parser
```

## Testing the Fix

Once rebuilt, test with hierarchical modules:

```bash
# Test 1: Simple module
echo 'module test (input wire clk); endmodule' > /tmp/test.sv
./schematex-parser /tmp/test.sv

# Test 2: Hierarchical (the case that used to hang)
cat > /tmp/hier.sv << 'EOF'
module processor (input wire clk);
    alu_unit alu_inst (.clk(clk), .result());
    mem_unit mem_inst (.clk(clk), .addr());
    cache_unit cache_inst (.clk(clk), .data());
endmodule
EOF

time ./schematex-parser /tmp/hier.sv
# Should complete instantly without hanging
```

## Verification

The parser should now:
- ✅ Return immediately (< 100ms) for hierarchical modules
- ✅ Parse instances correctly
- ✅ Not hang or freeze on malformed input
- ✅ Report errors for invalid syntax

## Notes

- The fix is minimal and conservative - it only prevents infinite loops
- Error recovery is improved but syntax error reporting remains unchanged
- The server-side 10s timeout in `prototype-tester/server.js` can be removed once the new binary is deployed
