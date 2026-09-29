// Priority encoder with a for loop and a valid flag.
// @expect-type combinational
module priority_encoder #(
    parameter int N = 16
) (
    input  logic [N-1:0]         req,
    output logic [$clog2(N)-1:0] idx,
    output logic                 valid
);
    always_comb begin
        idx   = '0;
        valid = 1'b0;
        for (int i = N - 1; i >= 0; i--) begin
            if (req[i]) begin
                idx   = i[$clog2(N)-1:0];
                valid = 1'b1;
            end
        end
    end
endmodule
