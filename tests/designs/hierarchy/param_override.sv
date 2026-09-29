// The same module instantiated with default, positional and named parameter overrides.
// Port widths must be elaborated per instance.
// @expect-type hierarchical
// @expect-instances 3
// @expect-port-width u_default.d 8
// @expect-port-width u_positional.d 4
// @expect-port-width u_named.d 16
module param_override (
    input  logic        clk,
    input  logic [7:0]  d8,
    input  logic [3:0]  d4,
    input  logic [15:0] d16,
    output logic [7:0]  q8,
    output logic [3:0]  q4,
    output logic [15:0] q16
);
    register                u_default    (.clk, .d(d8),  .q(q8));
    register #(4)           u_positional (.clk, .d(d4),  .q(q4));
    register #(.WIDTH(16))  u_named      (.clk, .d(d16), .q(q16));
endmodule

module register #(
    parameter int WIDTH = 8
) (
    input  logic             clk,
    input  logic [WIDTH-1:0] d,
    output logic [WIDTH-1:0] q
);
    always_ff @(posedge clk) q <= d;
endmodule
