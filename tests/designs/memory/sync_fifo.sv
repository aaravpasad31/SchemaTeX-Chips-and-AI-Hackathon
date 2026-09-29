// Synchronous FIFO: pointer logic around an instantiated dual-port RAM.
// @expect-type mixed
// @expect-instances 1
// @expect-net always_ff@28.wr_ptr -> u_ram.waddr
// @expect-net u_ram.rdata -> dout
module sync_fifo #(
    parameter int DEPTH = 16,
    parameter int WIDTH = 8
) (
    input  logic             clk,
    input  logic             rst,
    input  logic             push,
    input  logic [WIDTH-1:0] din,
    input  logic             pop,
    output logic [WIDTH-1:0] dout,
    output logic             full,
    output logic             empty
);
    localparam int          AW         = $clog2(DEPTH);
    localparam logic [AW:0] FULL_COUNT = (AW+1)'(DEPTH);

    logic [AW-1:0] wr_ptr, rd_ptr;
    logic [AW:0]   count;

    wire do_push = push && !full;
    wire do_pop  = pop && !empty;

    always_ff @(posedge clk) begin
        if (rst) begin
            wr_ptr <= '0;
            rd_ptr <= '0;
            count  <= '0;
        end else begin
            if (do_push) wr_ptr <= wr_ptr + 1'b1;
            if (do_pop)  rd_ptr <= rd_ptr + 1'b1;
            count <= count + (AW+1)'(do_push) - (AW+1)'(do_pop);
        end
    end

    dual_port_ram #(.DEPTH(DEPTH), .WIDTH(WIDTH)) u_ram (
        .wclk (clk),
        .we   (do_push),
        .waddr(wr_ptr),
        .wdata(din),
        .rclk (clk),
        .raddr(do_pop ? rd_ptr + 1'b1 : rd_ptr),
        .rdata(dout)
    );

    assign full  = (count == FULL_COUNT);
    assign empty = (count == '0);
endmodule

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

    always_ff @(posedge wclk) if (we) mem[waddr] <= wdata;
    always_ff @(posedge rclk) rdata <= mem[raddr];
endmodule
