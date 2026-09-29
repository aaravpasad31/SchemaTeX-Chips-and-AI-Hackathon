// Two unrelated top-level modules in one file (a design and its testbench-like wrapper
// share nothing). The web app should offer both.
// @expect-tops blinky button_sync
module blinky (
    input  logic clk,
    output logic led
);
    logic [23:0] cnt;
    always_ff @(posedge clk) cnt <= cnt + 1'b1;
    assign led = cnt[23];
endmodule

module button_sync (
    input  logic clk,
    input  logic btn,
    output logic btn_s
);
    logic meta;
    always_ff @(posedge clk) {btn_s, meta} <= {meta, btn};
endmodule
