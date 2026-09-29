// Vending machine accepting 5 and 10 cent coins; dispenses at 15 and returns change.
// @expect-type fsm
module vending_machine (
    input  logic clk,
    input  logic rst,
    input  logic nickel,
    input  logic dime,
    output logic dispense,
    output logic change
);
    typedef enum logic [1:0] {C0, C5, C10} credit_t;

    credit_t credit, credit_next;

    always_ff @(posedge clk) begin
        if (rst) credit <= C0;
        else     credit <= credit_next;
    end

    always_comb begin
        credit_next = credit;
        dispense    = 1'b0;
        change      = 1'b0;
        case (credit)
            C0:  if (dime) credit_next = C10;
                 else if (nickel) credit_next = C5;
            C5:  if (dime) begin
                     dispense = 1'b1; credit_next = C0;
                 end else if (nickel) credit_next = C10;
            C10: if (dime) begin
                     dispense = 1'b1; change = 1'b1; credit_next = C0;
                 end else if (nickel) begin
                     dispense = 1'b1; credit_next = C0;
                 end
            default: credit_next = C0;
        endcase
    end
endmodule
