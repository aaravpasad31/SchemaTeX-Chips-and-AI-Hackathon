// Every way to connect a port: named, positional, .*, .name shorthand, explicitly
// unconnected, constant, concatenation, part-select and expression.
// Leaving an output unconnected is legal but slang warns about it.
// @expect-diagnostic warning 39: output port 'carry' is explicitly connected to nothing
// @expect-type hierarchical
// @expect-instances 6
// @expect-net x -> u_named.a
// @expect-net y -> u_positional.b
// @expect-net a -> u_wildcard.a
// @expect-net b -> u_shorthand.b
// @expect-net lo -> u_concat.a
// @expect-net hi -> u_concat.a
// @expect-net x -> u_expr.a
// @expect-net y -> u_expr.a
// @expect-net u_named.y -> out_named
// @expect-net u_concat.y -> out_bus
module connection_styles (
    input  logic [7:0] x,
    input  logic [7:0] y,
    input  logic [7:0] a,
    input  logic [7:0] b,
    input  logic [3:0] lo,
    input  logic [3:0] hi,
    input  logic [15:0] wide,
    output logic [7:0] out_named,
    output logic [7:0] out_pos,
    output logic [7:0] out_wild,
    output logic [7:0] out_short,
    output logic [7:0] out_bus,
    output logic [7:0] out_expr
);
    logic carry, c_named, c_pos, c_short, c_concat;

    adder8 u_named      (.a(x), .b(y), .y(out_named), .carry(c_named));
    adder8 u_positional (x, y, out_pos, c_pos);
    adder8 u_wildcard   (.y(out_wild), .*);
    adder8 u_shorthand  (.a, .b, .y(out_short), .carry(c_short));
    adder8 u_concat     (.a({hi, lo}), .b(wide[15:8]), .y(out_bus), .carry(c_concat));
    adder8 u_expr       (.a(x & y), .b(8'd1), .y(out_expr), .carry());
endmodule

module adder8 (
    input  logic [7:0] a,
    input  logic [7:0] b,
    output logic [7:0] y,
    output logic       carry
);
    assign {carry, y} = a + b;
endmodule
