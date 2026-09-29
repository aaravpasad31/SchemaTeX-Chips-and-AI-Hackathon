// Two clock domains: a toggle in the source domain crossed with a 2-flop synchronizer.
// Both `clk_a` and `clk_b` should be detected as clocks.
// @expect-type sequential
module cdc_synchronizer (
    input  logic clk_a,
    input  logic clk_b,
    input  logic rst_a_n,
    input  logic rst_b_n,
    input  logic pulse_a,
    output logic pulse_b
);
    logic toggle_a;
    logic [2:0] sync_b;

    always_ff @(posedge clk_a or negedge rst_a_n) begin
        if (!rst_a_n)     toggle_a <= 1'b0;
        else if (pulse_a) toggle_a <= ~toggle_a;
    end

    always_ff @(posedge clk_b or negedge rst_b_n) begin
        if (!rst_b_n) sync_b <= '0;
        else          sync_b <= {sync_b[1:0], toggle_a};
    end

    assign pulse_b = sync_b[2] ^ sync_b[1];
endmodule
