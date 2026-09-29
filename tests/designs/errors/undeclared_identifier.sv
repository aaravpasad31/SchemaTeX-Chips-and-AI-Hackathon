// Reference to a signal that was never declared.
// @expect-diagnostic error 7: use of undeclared identifier 'enable'
module undeclared_identifier (
    input  logic a,
    output logic y
);
    assign y = a & enable;
endmodule
