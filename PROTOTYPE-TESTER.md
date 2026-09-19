# SchemaTeX Prototype Tester

**Interactive web app to verify the entire parser → JSON → diagram pipeline without VSCode.**

## Quick Start

```bash
# Install dependencies
npm install --prefix prototype-tester

# Start the server
npm start --prefix prototype-tester
```

Then open `http://localhost:3000` in your browser.

## What It Does

1. **Paste .sv code** into the editor
2. **Click Parse** to send it to the parser
3. **See the JSON AST** output from the C++ parser
4. **See the rendered diagram** (if JSON is valid)
5. **Debug errors** in real-time

This tests:
- ✅ Parser lexing/parsing
- ✅ JSON serialization
- ✅ Diagram rendering (ELK layout + React)
- ✅ End-to-end pipeline

## Why This Works

- No VSCode extension needed
- Direct visual feedback
- Can test multiple .sv examples interactively
- Shows exactly what the parser is doing
- Verifiable (see the JSON!)

## What to Test

Paste these into the editor and hit Parse:

### Simple Module
```systemverilog
module simple (
    input wire a,
    output wire b
);
endmodule
```

### Counter (the validation example)
```systemverilog
module counter_4bit (
    input wire clk,
    input wire reset,
    input wire enable,
    output logic [3:0] count
);

    logic [3:0] count_next;

    always_comb begin
        if (reset) begin
            count_next = 4'b0000;
        end else if (enable) begin
            count_next = count + 1;
        end else begin
            count_next = count;
        end
    end

    always_ff @(posedge clk) begin
        count <= count_next;
    end

endmodule
```

### With Ports and Logic
```systemverilog
module test (
    input wire clk,
    input wire [7:0] data_in,
    output logic [3:0] count
);

    logic [7:0] temp;

    always_comb begin
        temp = data_in;
    end

endmodule
```

## Files

- `prototype-tester/server.js` - Express server that spawns the C++ parser
- `prototype-tester/frontend.html` - Simple HTML/React UI
- `prototype-tester/package.json` - Dependencies
