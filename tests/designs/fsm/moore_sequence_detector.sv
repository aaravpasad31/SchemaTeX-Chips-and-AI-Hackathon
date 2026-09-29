// Moore machine detecting the sequence 1011 (overlapping); output depends only on state.
// @expect-type fsm
module moore_sequence_detector (
    input  logic clk,
    input  logic rst,
    input  logic din,
    output logic found
);
    typedef enum logic [2:0] {S0, S1, S10, S101, S1011} state_t;

    state_t state, next;

    always_ff @(posedge clk) begin
        if (rst) state <= S0;
        else     state <= next;
    end

    always_comb begin
        next = state;
        unique case (state)
            S0:    next = din ? S1    : S0;
            S1:    next = din ? S1    : S10;
            S10:   next = din ? S101  : S0;
            S101:  next = din ? S1011 : S10;
            S1011: next = din ? S1    : S10;
        endcase
    end

    assign found = (state == S1011);
endmodule
