// Single-port synchronous RAM with byte enables (read-first).
// @expect-type memory
module single_port_ram #(
    parameter int DEPTH = 256,
    parameter int BYTES = 4
) (
    input  logic                     clk,
    input  logic                     en,
    input  logic [BYTES-1:0]         we,
    input  logic [$clog2(DEPTH)-1:0] addr,
    input  logic [8*BYTES-1:0]       wdata,
    output logic [8*BYTES-1:0]       rdata
);
    logic [8*BYTES-1:0] mem [DEPTH];

    always_ff @(posedge clk) begin
        if (en) begin
            rdata <= mem[addr];
            for (int b = 0; b < BYTES; b++) begin
                if (we[b]) mem[addr][8*b +: 8] <= wdata[8*b +: 8];
            end
        end
    end
endmodule
