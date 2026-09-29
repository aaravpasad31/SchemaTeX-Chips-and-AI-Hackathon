// Plain Verilog-2001 style: reg/wire, always @(*), and ANSI ports without logic.
// @expect-type combinational
module verilog2001_style (
    input  wire  [7:0] a,
    input  wire  [7:0] b,
    input  wire        sel,
    output reg   [7:0] y,
    output wire  [8:0] sum
);
    always @(*) begin
        if (sel) y = a;
        else     y = b;
    end

    assign sum = a + b;
endmodule
