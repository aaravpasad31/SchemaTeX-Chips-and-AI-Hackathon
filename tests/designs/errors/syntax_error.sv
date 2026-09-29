// Missing semicolon and an unterminated port list. The server must return
// diagnostics rather than crash.
// @expect-diagnostic error 5: expected ';'
module syntax_error (input logic a, output logic y);
    logic t
    assign t = a;
    assign y = t;
endmodule
