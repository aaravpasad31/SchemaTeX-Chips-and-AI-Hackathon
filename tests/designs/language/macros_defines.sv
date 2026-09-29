// Preprocessor: `define with arguments, `ifdef / `else, and a macro used in a declaration.
// @expect-type sequential
`define WIDTH 12
`define REG(name, w) logic [(w)-1:0] name
`define USE_SATURATION

module macros_defines (
    input  logic              clk,
    input  logic [`WIDTH-1:0] inc,
    output logic [`WIDTH-1:0] total
);
    `REG(acc, `WIDTH);
    logic [`WIDTH:0] next;

    assign next = acc + inc;

    always_ff @(posedge clk) begin
`ifdef USE_SATURATION
        acc <= next[`WIDTH] ? '1 : next[`WIDTH-1:0];
`else
        acc <= next[`WIDTH-1:0];
`endif
    end

    assign total = acc;
endmodule
