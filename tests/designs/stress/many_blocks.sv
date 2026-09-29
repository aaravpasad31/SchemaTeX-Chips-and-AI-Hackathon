// One module with 40 independent assign statements and 10 always_ff blocks,
// generated from a loop. Stresses layout of many small nodes in a single level.
// @expect-type sequential
module many_blocks #(
    parameter int N = 10
) (
    input  logic         clk,
    input  logic [N-1:0] a,
    input  logic [N-1:0] b,
    output logic [N-1:0] q
);
    logic [N-1:0] and_ab, or_ab, xor_ab, sel;

    for (genvar i = 0; i < N; i++) begin : g_bit
        assign and_ab[i] = a[i] & b[i];
        assign or_ab[i]  = a[i] | b[i];
        assign xor_ab[i] = a[i] ^ b[i];
        assign sel[i]    = (i % 2 == 0) ? and_ab[i] : or_ab[i] ^ xor_ab[i];
        always_ff @(posedge clk) q[i] <= sel[i];
    end
endmodule
