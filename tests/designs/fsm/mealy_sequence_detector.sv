// Mealy machine detecting 110; output depends on state and input.
// @expect-type fsm
module mealy_sequence_detector (
    input  logic clk,
    input  logic rst_n,
    input  logic din,
    output logic found
);
    typedef enum logic [1:0] {IDLE, GOT1, GOT11} state_t;

    state_t state, next;

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) state <= IDLE;
        else        state <= next;
    end

    always_comb begin
        next  = state;
        found = 1'b0;
        case (state)
            IDLE:  if (din) next = GOT1;
            GOT1:  next = din ? GOT11 : IDLE;
            GOT11: if (!din) begin
                       next  = IDLE;
                       found = 1'b1;
                   end
            default: next = IDLE;
        endcase
    end
endmodule
