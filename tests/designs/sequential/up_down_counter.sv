// Up/down counter with load, terminal-count output and a separate next-state block.
// @expect-type sequential
module up_down_counter #(
    parameter int W = 8
) (
    input  logic         clk,
    input  logic         rst_n,
    input  logic         en,
    input  logic         up,
    input  logic         load,
    input  logic [W-1:0] load_val,
    output logic [W-1:0] count,
    output logic         tc
);
    logic [W-1:0] count_d;

    always_comb begin
        count_d = count;
        if (load)    count_d = load_val;
        else if (en) count_d = up ? count + 1'b1 : count - 1'b1;
    end

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) count <= '0;
        else        count <= count_d;
    end

    assign tc = en && (up ? (count == '1) : (count == '0));
endmodule
