// 16-bit Fibonacci LFSR with a seed load.
// @expect-type sequential
module lfsr #(
    parameter logic [15:0] SEED = 16'hACE1
) (
    input  logic        clk,
    input  logic        rst,
    input  logic        load,
    input  logic [15:0] seed,
    output logic [15:0] state,
    output logic        bit_out
);
    logic feedback;

    assign feedback = state[15] ^ state[13] ^ state[12] ^ state[10];

    always_ff @(posedge clk) begin
        if (rst)       state <= SEED;
        else if (load) state <= seed;
        else           state <= {state[14:0], feedback};
    end

    assign bit_out = state[0];
endmodule
