/**
 * 4-to-1 Multiplexer
 * Selects one of four 8-bit inputs based on 2-bit select signal
 */
module mux_4to1 (
    input  wire [7:0] a,
    input  wire [7:0] b,
    input  wire [7:0] c,
    input  wire [7:0] d,
    input  wire [1:0] sel,
    output logic [7:0] out
);

    always_comb begin
        case (sel)
            2'b00: out = a;
            2'b01: out = b;
            2'b10: out = c;
            2'b11: out = d;
            default: out = 8'b0;
        endcase
    end

endmodule
