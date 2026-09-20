/**
 * Test Case 3: SEQUENTIAL LOGIC BLOCK TYPE
 *
 * Component: Registered logic with always_ff blocks
 * Expected: Light box with clock input marked with special symbol
 * Spec: IEEE 91-1984, sequential logic with flip-flop representation
 */

module shift_register_8bit (
    input  wire       clk,
    input  wire       reset,
    input  wire [7:0] data_in,
    output logic [7:0] data_out
);

    logic [7:0] data_reg;

    // Sequential logic - state holding
    always_ff @(posedge clk or negedge reset) begin
        if (!reset)
            data_reg <= 8'b0;
        else
            data_reg <= data_in;
    end

    // Output assignment
    assign data_out = data_reg;

endmodule
