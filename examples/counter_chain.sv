// 4-bit counter module
module counter_4bit (
  input clk,
  input reset,
  output [3:0] count
);

  reg [3:0] count_reg;

  assign count = count_reg;

  always_ff @(posedge clk or posedge reset) begin
    if (reset)
      count_reg <= 4'b0000;
    else
      count_reg <= count_reg + 1;
  end

endmodule


// Top-level module with chained counters
module counter_chain (
  input clk,
  input reset,
  output [3:0] counter1_out,
  output [3:0] counter2_out,
  output [3:0] counter3_out
);

  wire [3:0] cnt1, cnt2, cnt3;

  // Instantiate first counter - driven by system clock
  counter_4bit counter1 (
    .clk(clk),
    .reset(reset),
    .count(cnt1)
  );

  // Instantiate second counter - driven by counter1 overflow (MSB)
  counter_4bit counter2 (
    .clk(cnt1[3]),
    .reset(reset),
    .count(cnt2)
  );

  // Instantiate third counter - driven by counter2 overflow
  counter_4bit counter3 (
    .clk(cnt2[3]),
    .reset(reset),
    .count(cnt3)
  );

  // Connect outputs
  assign counter1_out = cnt1;
  assign counter2_out = cnt2;
  assign counter3_out = cnt3;

endmodule
