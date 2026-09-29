// Parameterized N-input mux using an unpacked array input and an index.
// @expect-type combinational
module mux_param #(
    parameter int N     = 8,
    parameter int WIDTH = 16
) (
    input  logic [WIDTH-1:0]       in [N],
    input  logic [$clog2(N)-1:0]   sel,
    output logic [WIDTH-1:0]       out
);
    assign out = in[sel];
endmodule
