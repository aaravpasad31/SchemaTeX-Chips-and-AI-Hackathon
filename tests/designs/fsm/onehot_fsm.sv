// One-hot FSM encoded with plain bit vectors and localparams instead of an enum.
// The classifier only recognises enum-typed state, so this reads as plain sequential logic.
// @expect-type sequential
module onehot_fsm (
    input  logic clk,
    input  logic rst,
    input  logic go,
    input  logic stop,
    output logic running
);
    localparam int IDLE = 0, ACTIVE = 1, HALT = 2;

    logic [2:0] state, next;

    always_ff @(posedge clk) begin
        if (rst) state <= 3'b001;
        else     state <= next;
    end

    always_comb begin
        next = '0;
        case (1'b1)
            state[IDLE]:   if (go)   next[ACTIVE] = 1'b1; else next[IDLE] = 1'b1;
            state[ACTIVE]: if (stop) next[HALT]   = 1'b1; else next[ACTIVE] = 1'b1;
            state[HALT]:   next[IDLE] = 1'b1;
            default:       next[IDLE] = 1'b1;
        endcase
    end

    assign running = state[ACTIVE];
endmodule
