// Bidirectional (inout) pin with a tristate driver.
// @expect-type combinational
module tristate_bus (
    input  logic       oe,
    input  logic [7:0] dout,
    output logic [7:0] din,
    inout  wire  [7:0] pad
);
    assign pad = oe ? dout : 8'bz;
    assign din = pad;
endmodule
