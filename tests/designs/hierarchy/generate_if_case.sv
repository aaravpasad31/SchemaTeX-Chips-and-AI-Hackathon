// Implementation selected by generate-if and generate-case on parameters.
// Branches that aren't chosen must not appear in the diagram.
// @expect-type hierarchical
// @expect-instances 2
// @expect-net a -> g_mult.u_fast.a
// @expect-net a -> g_add.u_rca.a
module generate_if_case #(
    parameter bit    USE_FAST_MULT = 1,
    parameter string ADDER         = "ripple"
) (
    input  logic [7:0]  a,
    input  logic [7:0]  b,
    output logic [15:0] product,
    output logic [8:0]  sum
);
    if (USE_FAST_MULT) begin : g_mult
        fast_mult u_fast (.a, .b, .p(product));
    end else begin : g_mult
        slow_mult u_slow (.a, .b, .p(product));
    end

    case (ADDER)
        "ripple":    begin : g_add rca8 u_rca (.a, .b, .s(sum)); end
        "lookahead": begin : g_add cla8 u_cla (.a, .b, .s(sum)); end
        default:     begin : g_add rca8 u_rca (.a, .b, .s(sum)); end
    endcase
endmodule

module fast_mult (input logic [7:0] a, b, output logic [15:0] p); assign p = a * b; endmodule
module slow_mult (input logic [7:0] a, b, output logic [15:0] p); assign p = a * b; endmodule
module rca8 (input logic [7:0] a, b, output logic [8:0] s); assign s = a + b; endmodule
module cla8 (input logic [7:0] a, b, output logic [8:0] s); assign s = a + b; endmodule
