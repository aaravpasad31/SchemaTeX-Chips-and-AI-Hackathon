// Assuming counter_4bit is defined elsewhere
module counter_chain (
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
endmodule
