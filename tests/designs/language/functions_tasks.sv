// Functions and a task called from procedural code; their locals must not appear as module signals.
// @expect-type sequential
module functions_tasks (
    input  logic        clk,
    input  logic [31:0] word,
    output logic [5:0]  ones,
    output logic [31:0] reversed
);
    function automatic logic [5:0] popcount(input logic [31:0] v);
        logic [5:0] n;
        n = '0;
        for (int i = 0; i < 32; i++) n += 6'(v[i]);
        return n;
    endfunction

    task automatic reverse_bits(input logic [31:0] v, output logic [31:0] r);
        for (int i = 0; i < 32; i++) r[i] = v[31 - i];
    endtask

    logic [31:0] rev_d;

    always_comb reverse_bits(word, rev_d);

    always_ff @(posedge clk) begin
        ones     <= popcount(word);
        reversed <= rev_d;
    end
endmodule
