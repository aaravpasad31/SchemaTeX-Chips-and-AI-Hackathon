// 32-stage pipeline built with a generate loop, plus a valid chain in a packed vector.
// @expect-type mixed
// @expect-instances 32
// @expect-net g_stage[0].u_stage.dout -> g_stage[1].u_stage.din
// @expect-net g_stage[30].u_stage.dout -> g_stage[31].u_stage.din
// @expect-no-net g_stage[0].u_stage.dout -> g_stage[31].u_stage.din
module deep_pipeline #(
    parameter int STAGES = 32,
    parameter int W      = 16
) (
    input  logic         clk,
    input  logic         in_valid,
    input  logic [W-1:0] din,
    output logic         out_valid,
    output logic [W-1:0] dout
);
    logic [W-1:0]    data  [STAGES+1];
    logic [STAGES:0] valid;

    assign data[0]  = din;
    assign valid[0] = in_valid;

    for (genvar i = 0; i < STAGES; i++) begin : g_stage
        pipe_stage #(.W(W), .K(i)) u_stage (
            .clk,
            .vin (valid[i]),
            .din (data[i]),
            .vout(valid[i+1]),
            .dout(data[i+1])
        );
    end

    assign dout      = data[STAGES];
    assign out_valid = valid[STAGES];
endmodule

module pipe_stage #(
    parameter int W = 16,
    parameter int K = 0
) (
    input  logic         clk,
    input  logic         vin,
    input  logic [W-1:0] din,
    output logic         vout,
    output logic [W-1:0] dout
);
    always_ff @(posedge clk) begin
        vout <= vin;
        dout <= din ^ W'(unsigned'(K));
    end
endmodule
