/**
 * Test Case 5: MEMORY BLOCK TYPE
 *
 * Component: Array-based storage with read/write logic
 * Expected: Box with diagonal hatch pattern, capacity labeled
 * Spec: IEEE 91-1984, memory component representation
 */

module dual_port_ram (
    input  wire       clk,
    input  wire [9:0] addr_rd,
    input  wire [9:0] addr_wr,
    input  wire [31:0] data_in,
    input  wire       we,
    output logic [31:0] data_out
);

    // Memory array: 1024 × 32-bit
    logic [31:0] mem [0:1023];

    // Read port (asynchronous)
    always_comb begin
        data_out = mem[addr_rd];
    end

    // Write port (synchronous)
    always_ff @(posedge clk) begin
        if (we)
            mem[addr_wr] <= data_in;
    end

endmodule
