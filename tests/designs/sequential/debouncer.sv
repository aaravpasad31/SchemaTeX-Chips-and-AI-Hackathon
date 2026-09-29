// Button debouncer: two-flop synchronizer, a stability counter and an output register.
// @expect-type sequential
module debouncer #(
    parameter int COUNT_MAX = 50_000
) (
    input  logic clk,
    input  logic rst,
    input  logic btn_raw,
    output logic btn_clean
);
    localparam int            CW  = $clog2(COUNT_MAX + 1);
    localparam logic [CW-1:0] MAX = CW'(COUNT_MAX);

    logic          sync0, sync1;
    logic [CW-1:0] stable_cnt;

    always_ff @(posedge clk) begin
        sync0 <= btn_raw;
        sync1 <= sync0;
    end

    always_ff @(posedge clk) begin
        if (rst || sync1 == btn_clean)
            stable_cnt <= '0;
        else if (stable_cnt != MAX)
            stable_cnt <= stable_cnt + 1'b1;
    end

    always_ff @(posedge clk) begin
        if (rst)                               btn_clean <= 1'b0;
        else if (stable_cnt == MAX) btn_clean <= sync1;
    end
endmodule
