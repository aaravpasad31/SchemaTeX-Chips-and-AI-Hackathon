// N-bit ripple-carry adder: a generate loop of full adders chained through a
// packed carry vector, the way it is usually written.
// Each carry bit connects exactly one adder to the next.
// @expect-type mixed
// @expect-instances 4
// @expect-net cin -> assign@24.cin
// @expect-net assign@24.carry[0] -> g_bit[0].u_fa.cin
// @expect-net g_bit[3].u_fa.cout -> assign@36.carry[4]
// @expect-net g_bit[0].u_fa.cout -> g_bit[1].u_fa.cin
// @expect-net g_bit[2].u_fa.cout -> g_bit[3].u_fa.cin
// @expect-no-net g_bit[0].u_fa.cout -> g_bit[2].u_fa.cin
// @expect-no-net g_bit[3].u_fa.cout -> g_bit[1].u_fa.cin
module ripple_carry_adder #(
    parameter int N = 4
) (
    input  logic [N-1:0] a,
    input  logic [N-1:0] b,
    input  logic         cin,
    output logic [N-1:0] sum,
    output logic         cout
);
    logic [N:0] carry;

    assign carry[0] = cin;

    for (genvar i = 0; i < N; i++) begin : g_bit
        full_adder u_fa (
            .a   (a[i]),
            .b   (b[i]),
            .cin (carry[i]),
            .sum (sum[i]),
            .cout(carry[i+1])
        );
    end

    assign cout = carry[N];
endmodule

module full_adder (
    input  logic a,
    input  logic b,
    input  logic cin,
    output logic sum,
    output logic cout
);
    assign sum  = a ^ b ^ cin;
    assign cout = (a & b) | (cin & (a ^ b));
endmodule
