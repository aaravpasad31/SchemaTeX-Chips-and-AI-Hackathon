// Three levels of hierarchy: soc -> 2 clusters -> 2 cores each -> 1 alu each.
// @expect-type hierarchical
// @expect-instances 10
// @expect-net clk -> u_cluster0.clk
// @expect-net u_cluster0.result -> u_cluster1.operand
module soc (
    input  logic        clk,
    input  logic        rst,
    input  logic [15:0] operand,
    output logic [15:0] result
);
    logic [15:0] mid;

    cluster u_cluster0 (.clk, .rst, .operand(operand), .result(mid));
    cluster u_cluster1 (.clk, .rst, .operand(mid),     .result(result));
endmodule

module cluster (
    input  logic        clk,
    input  logic        rst,
    input  logic [15:0] operand,
    output logic [15:0] result
);
    logic [15:0] link;

    core u_core0 (.clk, .rst, .din(operand), .dout(link));
    core u_core1 (.clk, .rst, .din(link),    .dout(result));
endmodule

module core (
    input  logic        clk,
    input  logic        rst,
    input  logic [15:0] din,
    output logic [15:0] dout
);
    logic [15:0] acc, alu_out;

    alu16 u_alu (.a(acc), .b(din), .y(alu_out));

    always_ff @(posedge clk) begin
        if (rst) acc <= '0;
        else     acc <= alu_out;
    end

    assign dout = acc;
endmodule

module alu16 (
    input  logic [15:0] a,
    input  logic [15:0] b,
    output logic [15:0] y
);
    assign y = a + b;
endmodule
