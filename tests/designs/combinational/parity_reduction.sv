// Reduction operators and a concatenated output.
// @expect-type combinational
module parity_reduction (
    input  logic [31:0] data,
    output logic        even_parity,
    output logic        all_ones,
    output logic        any_ones,
    output logic [2:0]  flags
);
    assign even_parity = ~^data;
    assign all_ones    = &data;
    assign any_ones    = |data;
    assign flags       = {even_parity, all_ones, any_ones};
endmodule
