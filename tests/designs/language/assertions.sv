// Concurrent and immediate assertions next to ordinary logic. The assertions aren't drawn.
// @expect-type sequential
module assertions (
    input  logic clk,
    input  logic rst_n,
    input  logic req,
    output logic gnt
);
    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) gnt <= 1'b0;
        else        gnt <= req;
    end

    property p_req_then_gnt;
        @(posedge clk) disable iff (!rst_n) req |=> gnt;
    endproperty

    a_req_gnt: assert property (p_req_then_gnt);

    always_comb begin
        a_no_gnt_in_reset: assert (rst_n || !gnt);
    end
endmodule
