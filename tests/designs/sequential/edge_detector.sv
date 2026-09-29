// Rising/falling edge detector on a registered input.
// @expect-type sequential
module edge_detector (
    input  logic clk,
    input  logic rst_n,
    input  logic sig,
    output logic rise,
    output logic fall
);
    logic sig_q;

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) sig_q <= 1'b0;
        else        sig_q <= sig;
    end

    assign rise = sig & ~sig_q;
    assign fall = ~sig & sig_q;
endmodule
