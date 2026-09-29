// Recursively instantiated adder tree: each level splits its inputs in half until one remains.
// A module that instantiates itself is never a top-level module, so a wrapper is needed.
// With N=8 the tree is 1 + 2 + 4 + 8 = 15 instances below the wrapper.
// @expect-type hierarchical
// @expect-instances 15
// @expect-net u_tree.sum -> sum
module adder_tree_top (
    input  logic [7:0]  in [8],
    output logic [10:0] sum
);
    recursive_tree #(.N(8), .W(8)) u_tree (.in, .sum);
endmodule

module recursive_tree #(
    parameter int N = 8,
    parameter int W = 8
) (
    input  logic [W-1:0]            in [N],
    output logic [W+$clog2(N)-1:0]  sum
);
    if (N == 1) begin : g_leaf
        assign sum = in[0];
    end else begin : g_split
        localparam int HALF = N / 2;
        logic [W+$clog2(HALF)-1:0]     sum_lo;
        logic [W+$clog2(N-HALF)-1:0]   sum_hi;

        recursive_tree #(.N(HALF),     .W(W)) u_lo (.in(in[0:HALF-1]), .sum(sum_lo));
        recursive_tree #(.N(N - HALF), .W(W)) u_hi (.in(in[HALF:N-1]), .sum(sum_hi));

        assign sum = sum_lo + sum_hi;
    end
endmodule
