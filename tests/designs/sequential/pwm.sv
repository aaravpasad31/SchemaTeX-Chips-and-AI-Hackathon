// PWM generator with a free-running counter and a duty-cycle compare.
// @expect-type sequential
module pwm #(
    parameter int W = 10
) (
    input  logic         clk,
    input  logic         rst_n,
    input  logic [W-1:0] duty,
    output logic         pwm_out
);
    logic [W-1:0] counter;

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) counter <= '0;
        else        counter <= counter + 1'b1;
    end

    assign pwm_out = (counter < duty);
endmodule
