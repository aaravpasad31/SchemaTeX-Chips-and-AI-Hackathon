// Magnitude comparator using an automatic function.
// @expect-type combinational
module comparator_function #(
    parameter int W = 8
) (
    input  logic [W-1:0] a,
    input  logic [W-1:0] b,
    input  logic         is_signed,
    output logic         lt,
    output logic         eq,
    output logic         gt
);
    function automatic logic less_than(input logic [W-1:0] x, input logic [W-1:0] y, input logic s);
        return s ? ($signed(x) < $signed(y)) : (x < y);
    endfunction

    assign lt = less_than(a, b, is_signed);
    assign gt = less_than(b, a, is_signed);
    assign eq = (a == b);
endmodule
