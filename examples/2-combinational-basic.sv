/**
 * Test Case 2: COMBINATIONAL LOGIC BLOCK TYPE
 *
 * Component: Pure combinational logic (always_comb or assign)
 * Expected: Single light box with input ports left, output ports right
 * Spec: IEEE 91-1984, combinational logic representation
 */

module mux_4to1 (
    input  wire [1:0] sel,
    input  wire [7:0] a,
    input  wire [7:0] b,
    input  wire [7:0] c,
    input  wire [7:0] d,
    output logic [7:0] out
);

    // Pure combinational logic - no state
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
