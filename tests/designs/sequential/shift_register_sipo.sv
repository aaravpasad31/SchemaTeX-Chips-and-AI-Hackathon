// Serial-in, parallel-out shift register with a parallel-load output register.
// @expect-type sequential
module shift_register_sipo #(
    parameter int W = 8
) (
    input  logic         clk,
    input  logic         rst,
    input  logic         sin,
    input  logic         latch,
    output logic [W-1:0] pout
);
    logic [W-1:0] shreg;

    always_ff @(posedge clk) begin
        if (rst) shreg <= '0;
        else     shreg <= {shreg[W-2:0], sin};
    end

    always_ff @(posedge clk) begin
        if (latch) pout <= shreg;
    end
endmodule
