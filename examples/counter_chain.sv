// Individual 4-bit counter module (leaf node)
module counter_4bit (
  input wire clk,
  input wire reset,
  output wire [3:0] count
);
  wire [3:0] count_reg;
  assign count = count_reg;
endmodule


// Top-level hierarchical module with three counter instances
module counter_chain (
  input wire clk,
  input wire reset,
  output wire [3:0] out1,
  output wire [3:0] out2,
  output wire [3:0] out3
);

  wire [3:0] cnt1;
  wire [3:0] cnt2;
  wire [3:0] cnt3;

  // Counter 1: clocked by system clock
  counter_4bit c1 (
    .clk(clk),
    .reset(reset),
    .count(cnt1)
  );

  // Counter 2: clocked by counter 1 output
  counter_4bit c2 (
    .clk(cnt1[3]),
    .reset(reset),
    .count(cnt2)
  );

  // Counter 3: clocked by counter 2 output
  counter_4bit c3 (
    .clk(cnt2[3]),
    .reset(reset),
    .count(cnt3)
  );

  // Connect outputs
  assign out1 = cnt1;
  assign out2 = cnt2;
  assign out3 = cnt3;

endmodule
