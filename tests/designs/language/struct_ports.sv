// Packed struct ports; the block writes individual struct members.
// Member writes must still count as writes to the whole struct signal.
// @expect-type sequential
module struct_ports (
    input  logic clk,
    input  logic [7:0] r, g, b,
    output struct packed {
        logic [7:0] y;
        logic [7:0] u;
        logic [7:0] v;
    } yuv
);
    always_ff @(posedge clk) begin
        yuv.y <= (r >> 2) + (g >> 1) + (b >> 3);
        yuv.u <= b - yuv.y;
        yuv.v <= r - yuv.y;
    end
endmodule
