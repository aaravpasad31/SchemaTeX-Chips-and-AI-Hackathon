// Small content-addressable memory: parallel compare against every stored entry.
// @expect-type memory
module cam #(
    parameter int ENTRIES = 8,
    parameter int KEY_W   = 12
) (
    input  logic                       clk,
    input  logic                       we,
    input  logic [$clog2(ENTRIES)-1:0] waddr,
    input  logic [KEY_W-1:0]           wkey,
    input  logic [KEY_W-1:0]           search,
    output logic [ENTRIES-1:0]         match,
    output logic                       hit
);
    logic [KEY_W-1:0] keys  [ENTRIES];
    logic             valid [ENTRIES];

    always_ff @(posedge clk) begin
        if (we) begin
            keys[waddr]  <= wkey;
            valid[waddr] <= 1'b1;
        end
    end

    always_comb begin
        for (int i = 0; i < ENTRIES; i++) match[i] = valid[i] && keys[i] == search;
    end

    assign hit = |match;
endmodule
