// Multi-dimensional packed arrays: a 4x8 byte lane swap and a transpose.
// @expect-type combinational
module multidim_packed (
    input  logic [3:0][7:0] lanes_in,
    input  logic            swap,
    output logic [3:0][7:0] lanes_out,
    output logic [7:0][3:0] transposed
);
    always_comb begin
        for (int i = 0; i < 4; i++)
            lanes_out[i] = swap ? lanes_in[3 - i] : lanes_in[i];
    end

    always_comb begin
        for (int r = 0; r < 4; r++)
            for (int c = 0; c < 8; c++)
                transposed[c][r] = lanes_in[r][c];
    end
endmodule
