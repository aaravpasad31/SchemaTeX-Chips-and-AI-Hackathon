// The same variable driven by a continuous assignment and by an always_ff block.
// slang reports this from its analysis pass, as a warning (-Wmixed-var-assigns).
// @expect-diagnostic warning 12: cannot mix continuous and procedural assignments to variable 'q'
module multiple_drivers (
    input  logic clk,
    input  logic d,
    input  logic e,
    output logic q
);
    always_ff @(posedge clk) q <= d;

    assign q = e;
endmodule
