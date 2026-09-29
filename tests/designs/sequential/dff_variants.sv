// Four flip-flop styles in one module: async active-low reset, sync reset, enable, and no reset.
// Only `clk` should be marked as a clock; `rst_n` and `srst` are resets.
// @expect-type sequential
module dff_variants (
    input  logic       clk,
    input  logic       rst_n,
    input  logic       srst,
    input  logic       en,
    input  logic [7:0] d,
    output logic [7:0] q_async,
    output logic [7:0] q_sync,
    output logic [7:0] q_en,
    output logic [7:0] q_plain
);
    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) q_async <= '0;
        else        q_async <= d;
    end

    always_ff @(posedge clk) begin
        if (srst) q_sync <= '0;
        else      q_sync <= d;
    end

    always_ff @(posedge clk) begin
        if (en) q_en <= d;
    end

    always_ff @(posedge clk) q_plain <= d;
endmodule
