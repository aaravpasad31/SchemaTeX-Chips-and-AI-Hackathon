// 3-to-8 one-hot decoder with enable, written with a shift.
// @expect-type combinational
module decoder_3to8 (
    input  logic       en,
    input  logic [2:0] a,
    output logic [7:0] y
);
    always_comb begin
        y = '0;
        if (en) y = 8'b1 << a;
    end
endmodule
