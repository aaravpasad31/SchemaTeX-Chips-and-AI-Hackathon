// A SystemVerilog interface with modports connecting a producer and a consumer.
// Interface ports aren't drawn as wires yet; this checks they elaborate and don't break extraction.
// @expect-type hierarchical
// @expect-instances 3
interface stream_if #(parameter int W = 8) (input logic clk);
    logic         valid;
    logic         ready;
    logic [W-1:0] data;

    modport source (output valid, data, input ready, clk);
    modport sink   (input valid, data, clk, output ready);
endinterface

module interface_bus (
    input  logic       clk,
    input  logic       rst,
    output logic [7:0] last_seen
);
    stream_if #(.W(8)) link (.clk);

    producer u_prod (.rst, .out(link));
    consumer u_cons (.rst, .in(link), .last_seen);
endmodule

module producer (
    input logic rst,
    stream_if.source out
);
    always_ff @(posedge out.clk) begin
        if (rst) begin
            out.valid <= 1'b0;
            out.data  <= '0;
        end else if (out.ready) begin
            out.valid <= 1'b1;
            out.data  <= out.data + 1'b1;
        end
    end
endmodule

module consumer (
    input  logic rst,
    stream_if.sink in,
    output logic [7:0] last_seen
);
    assign in.ready = !rst;

    always_ff @(posedge in.clk) begin
        if (in.valid && in.ready) last_seen <= in.data;
    end
endmodule
