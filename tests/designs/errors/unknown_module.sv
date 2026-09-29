// Instance of a module that doesn't exist. The rest of the design should still come through.
// @expect-diagnostic error 10: unknown module 'mystery_block'
// @expect-tops unknown_module
module unknown_module (
    input  logic clk,
    input  logic d,
    output logic q
);
    always_ff @(posedge clk) q <= d;
    mystery_block u_mystery (.clk, .d);
endmodule
