// Logarithmic barrel shifter: one stage per bit of the shift amount, chained through an array.
// @expect-type combinational
module barrel_shifter #(
    parameter int W = 16
) (
    input  logic [W-1:0]         din,
    input  logic [$clog2(W)-1:0] shamt,
    input  logic                 rotate,
    output logic [W-1:0]         dout
);
    localparam int S = $clog2(W);

    logic [W-1:0] stage [S+1];

    assign stage[0] = din;

    for (genvar i = 0; i < S; i++) begin : g_stage
        always_comb begin
            if (!shamt[i])
                stage[i+1] = stage[i];
            else if (rotate)
                stage[i+1] = {stage[i][W-1-(1<<i):0], stage[i][W-1:W-(1<<i)]};
            else
                stage[i+1] = {stage[i][W-1-(1<<i):0], {(1<<i){1'b0}}};
        end
    end

    assign dout = stage[S];
endmodule
