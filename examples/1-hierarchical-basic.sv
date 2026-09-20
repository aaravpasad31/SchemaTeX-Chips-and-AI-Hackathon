/**
 * Test Case 1: HIERARCHICAL BLOCK TYPE
 *
 * Component: Module containing only child instances, no internal logic
 * Expected: Outer box with 3 nested child boxes
 * Spec: IEEE 91-1984, hierarchical decomposition
 */

module top_level (
    input  wire       clk,
    input  wire [7:0] data_in,
    output wire [7:0] data_out
);

    // Only instances, no logic blocks
    alu_unit alu_inst (
        .clk(clk),
        .a(data_in),
        .b(8'h00),
        .result()
    );

    memory_unit mem_inst (
        .clk(clk),
        .addr(3'b000),
        .data_out(data_out)
    );

    control_unit ctrl_inst (
        .clk(clk),
        .enable(1'b1)
    );

endmodule
