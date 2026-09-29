// Hex digit to seven-segment decoder (a case table).
// @expect-type combinational
module seven_segment (
    input  logic [3:0] digit,
    input  logic       active_low,
    output logic [6:0] seg
);
    logic [6:0] raw;

    always_comb begin
        case (digit)
            4'h0: raw = 7'b0111111;
            4'h1: raw = 7'b0000110;
            4'h2: raw = 7'b1011011;
            4'h3: raw = 7'b1001111;
            4'h4: raw = 7'b1100110;
            4'h5: raw = 7'b1101101;
            4'h6: raw = 7'b1111101;
            4'h7: raw = 7'b0000111;
            4'h8: raw = 7'b1111111;
            4'h9: raw = 7'b1101111;
            4'hA: raw = 7'b1110111;
            4'hB: raw = 7'b1111100;
            4'hC: raw = 7'b0111001;
            4'hD: raw = 7'b1011110;
            4'hE: raw = 7'b1111001;
            default: raw = 7'b1110001;
        endcase
    end

    assign seg = active_low ? ~raw : raw;
endmodule
