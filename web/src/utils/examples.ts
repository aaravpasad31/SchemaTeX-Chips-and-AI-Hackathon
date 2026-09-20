import type { Example } from '../types'

export const examples: Record<string, Example> = {
  counter_4bit: {
    name: '4-bit Counter',
    code: `module counter_4bit (
    input wire clk,
    input wire reset,
    input wire enable,
    output logic [3:0] count
);

    logic [3:0] count_next;

    always_comb begin
        if (reset) begin
            count_next = 4'b0000;
        end else if (enable) begin
            count_next = count + 1;
        end else begin
            count_next = count;
        end
    end

    always_ff @(posedge clk) begin
        count <= count_next;
    end

endmodule`,
  },
  counter_chain: {
    name: 'Counter Chain (Hierarchical)',
    code: `module counter_chain (
  input clk,
  input reset,
  output [3:0] out1,
  output [3:0] out2,
  output [3:0] out3
);
  wire [3:0] cnt1, cnt2, cnt3;

  counter_4bit c1 (.clk(clk), .reset(reset), .count(cnt1));
  counter_4bit c2 (.clk(clk), .reset(reset), .count(cnt2));
  counter_4bit c3 (.clk(clk), .reset(reset), .count(cnt3));

  assign out1 = cnt1;
  assign out2 = cnt2;
  assign out3 = cnt3;
endmodule`,
  },
  hierarchical: {
    name: 'Hierarchical (Multi-Module)',
    code: `module top_level (
    input  wire       clk,
    input  wire [7:0] data_in,
    output wire [7:0] data_out
);

    alu_unit alu_inst (
        .clk(clk),
        .a(data_in),
        .b(8'h00),
        .result()
    );

    memory_unit mem_inst (
        .clk(clk),
        .addr(3'b000),
        .data_out(data_out)
    );

    control_unit ctrl_inst (
        .clk(clk),
        .enable(1'b1)
    );

endmodule`,
  },
  mux: {
    name: 'Combinational (Mux)',
    code: `module mux_4to1 (
    input  wire [1:0] sel,
    input  wire [7:0] a,
    input  wire [7:0] b,
    input  wire [7:0] c,
    input  wire [7:0] d,
    output logic [7:0] out
);

    always_comb begin
        case (sel)
            2'b00: out = a;
            2'b01: out = b;
            2'b10: out = c;
            2'b11: out = d;
            default: out = 8'b0;
        endcase
    end

endmodule`,
  },
}
