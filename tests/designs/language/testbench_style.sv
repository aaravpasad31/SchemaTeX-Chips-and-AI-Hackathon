// Simulation-only constructs: initial blocks, delays, $display and a clock generator.
// @expect-type mixed
// @expect-instances 1
module testbench_style;
    logic clk = 1'b0;
    logic rst;
    logic [3:0] count;

    always #5 clk = ~clk;

    counter4 dut (.clk, .rst, .count);

    initial begin
        rst = 1'b1;
        #20 rst = 1'b0;
        #200 $display("count = %0d", count);
        $finish;
    end
endmodule

module counter4 (
    input  logic       clk,
    input  logic       rst,
    output logic [3:0] count
);
    always_ff @(posedge clk) count <= rst ? '0 : count + 1'b1;
endmodule
