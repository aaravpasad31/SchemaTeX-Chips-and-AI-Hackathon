// Divide-by-2N clock divider whose output clocks a second register.
// `clk_div` is internal but should be detected as a clock by the second block.
// @expect-type sequential
module clock_divider #(
    parameter int N = 4
) (
    input  logic       clk,
    input  logic       rst,
    input  logic [3:0] d,
    output logic [3:0] q_slow
);
    localparam logic [$clog2(N)-1:0] LAST = $clog2(N)'(N - 1);

    logic [$clog2(N)-1:0] cnt;
    logic                 clk_div;

    always_ff @(posedge clk) begin
        if (rst) begin
            cnt     <= '0;
            clk_div <= 1'b0;
        end else if (cnt == LAST) begin
            cnt     <= '0;
            clk_div <= ~clk_div;
        end else begin
            cnt <= cnt + 1'b1;
        end
    end

    always_ff @(posedge clk_div) q_slow <= d;
endmodule
