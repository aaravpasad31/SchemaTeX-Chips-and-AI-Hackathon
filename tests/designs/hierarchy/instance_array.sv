// Array of instances: one flip-flop per bit, with vector ports sliced across the array.
// @expect-type hierarchical
// @expect-instances 8
// @expect-net clk -> u_bit[0].clk
// @expect-net d -> u_bit[7].d
// @expect-net u_bit[3].q -> q
module instance_array (
    input  logic       clk,
    input  logic [7:0] d,
    output logic [7:0] q
);
    bit_ff u_bit [7:0] (.clk(clk), .d(d), .q(q));
endmodule

module bit_ff (
    input  logic clk,
    input  logic d,
    output logic q
);
    always_ff @(posedge clk) q <= d;
endmodule
