// Simple dual-port RAM: independent write and read clocks.
// @expect-type memory
module dual_port_ram #(
    parameter int DEPTH = 64,
    parameter int WIDTH = 16
) (
    input  logic                     wclk,
    input  logic                     we,
    input  logic [$clog2(DEPTH)-1:0] waddr,
    input  logic [WIDTH-1:0]         wdata,
    input  logic                     rclk,
    input  logic [$clog2(DEPTH)-1:0] raddr,
    output logic [WIDTH-1:0]         rdata
);
    logic [WIDTH-1:0] mem [DEPTH];

    always_ff @(posedge wclk) begin
        if (we) mem[waddr] <= wdata;
    end

    always_ff @(posedge rclk) begin
        rdata <= mem[raddr];
    end
endmodule
