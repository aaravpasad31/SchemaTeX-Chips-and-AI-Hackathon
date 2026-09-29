// Named connection to a port the child module doesn't have.
// @expect-diagnostic error 10: port 'enable' does not exist in 'child'
module bad_port_connection (
    input  logic clk,
    input  logic d,
    output logic q
);
    child u_child (
        .clk, .d, .q,
        .enable(1'b1)
    );
endmodule

module child (input logic clk, input logic d, output logic q);
    always_ff @(posedge clk) q <= d;
endmodule
