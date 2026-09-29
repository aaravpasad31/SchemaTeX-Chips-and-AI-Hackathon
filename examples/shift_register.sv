/**
 * Parameterized shift register built from a generate loop of flip-flops.
 * Exercises parameters, generate blocks and bit-select port connections.
 */
module dff #(
    parameter int WIDTH = 1
) (
    input  logic             clk,
    input  logic             reset,
    input  logic [WIDTH-1:0] d,
    output logic [WIDTH-1:0] q
);

    always_ff @(posedge clk) begin
        if (reset) q <= '0;
        else       q <= d;
    end

endmodule

module shift_register #(
    parameter int DEPTH = 4,
    parameter int WIDTH = 8
) (
    input  logic             clk,
    input  logic             reset,
    input  logic [WIDTH-1:0] din,
    output logic [WIDTH-1:0] dout
);

    logic [WIDTH-1:0] taps [DEPTH+1];

    assign taps[0] = din;

    for (genvar i = 0; i < DEPTH; i++) begin : stage
        dff #(.WIDTH(WIDTH)) ff (
            .clk  (clk),
            .reset(reset),
            .d    (taps[i]),
            .q    (taps[i+1])
        );
    end

    assign dout = taps[DEPTH];

endmodule
