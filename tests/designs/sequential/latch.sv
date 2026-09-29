// Transparent latch and a clock-gating cell built from always_latch.
// @expect-type combinational
module latch (
    input  logic       clk,
    input  logic       en,
    input  logic       gate,
    input  logic [7:0] d,
    output logic [7:0] q,
    output logic       gclk
);
    logic en_latched;

    always_latch begin
        if (gate) q <= d;
    end

    always_latch begin
        if (!clk) en_latched <= en;
    end

    assign gclk = clk & en_latched;
endmodule
