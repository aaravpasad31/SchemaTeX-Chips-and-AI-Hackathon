// Register file: two combinational read ports, one write port, register 0 hardwired to zero.
// @expect-type memory
module register_file #(
    parameter int REGS  = 32,
    parameter int WIDTH = 32
) (
    input  logic                    clk,
    input  logic                    we,
    input  logic [$clog2(REGS)-1:0] waddr,
    input  logic [WIDTH-1:0]        wdata,
    input  logic [$clog2(REGS)-1:0] raddr_a,
    input  logic [$clog2(REGS)-1:0] raddr_b,
    output logic [WIDTH-1:0]        rdata_a,
    output logic [WIDTH-1:0]        rdata_b
);
    logic [WIDTH-1:0] regs [REGS];

    always_ff @(posedge clk) begin
        if (we && waddr != '0) regs[waddr] <= wdata;
    end

    assign rdata_a = (raddr_a == '0) ? '0 : regs[raddr_a];
    assign rdata_b = (raddr_b == '0) ? '0 : regs[raddr_b];
endmodule
