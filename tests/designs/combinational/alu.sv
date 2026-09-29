// ALU with an enum opcode type and flags, split over several always_comb/assign blocks.
// @expect-type combinational
module alu #(
    parameter int W = 32
) (
    input  logic [W-1:0] a,
    input  logic [W-1:0] b,
    input  logic [2:0]   op,
    output logic [W-1:0] y,
    output logic         zero,
    output logic         negative,
    output logic         carry
);
    typedef enum logic [2:0] {ADD, SUB, AND_, OR_, XOR_, SLT, SLL, SRL} op_t;

    logic [W:0] sum;

    always_comb begin
        sum = '0;
        case (op_t'(op))
            ADD:  sum = {1'b0, a} + {1'b0, b};
            SUB:  sum = {1'b0, a} - {1'b0, b};
            AND_, OR_, XOR_, SLT, SLL, SRL: sum = '0;
            default: sum = '0;
        endcase
    end

    always_comb begin
        case (op_t'(op))
            ADD, SUB: y = sum[W-1:0];
            AND_:     y = a & b;
            OR_:      y = a | b;
            XOR_:     y = a ^ b;
            SLT:      y = W'($signed(a) < $signed(b));
            SLL:      y = a << b[$clog2(W)-1:0];
            SRL:      y = a >> b[$clog2(W)-1:0];
            default:  y = '0;
        endcase
    end

    assign zero     = (y == '0);
    assign negative = y[W-1];
    assign carry    = sum[W];
endmodule
