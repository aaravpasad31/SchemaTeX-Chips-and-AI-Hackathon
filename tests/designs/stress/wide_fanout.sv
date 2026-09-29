// One clock, reset and enable fanning out to 48 registers, each with its own data bit.
// @expect-type hierarchical
// @expect-instances 48
// @expect-net clk -> g_reg[47].u_ff.clk
module wide_fanout #(
    parameter int N = 48
) (
    input  logic         clk,
    input  logic         rst,
    input  logic         en,
    input  logic [N-1:0] d,
    output logic [N-1:0] q
);
    for (genvar i = 0; i < N; i++) begin : g_reg
        en_ff u_ff (.clk, .rst, .en, .d(d[i]), .q(q[i]));
    end
endmodule

module en_ff (
    input  logic clk,
    input  logic rst,
    input  logic en,
    input  logic d,
    output logic q
);
    always_ff @(posedge clk) begin
        if (rst)     q <= 1'b0;
        else if (en) q <= d;
    end
endmodule
