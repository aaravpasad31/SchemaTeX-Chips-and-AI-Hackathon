// Procedural assignment to a net: the bug that used to be in examples/processor.sv.
// @expect-diagnostic error 8: cannot assign to a net within a procedural context
module wire_in_always (
    input  logic a,
    output wire  y
);
    always_comb begin
        y = a;
    end
endmodule
