// Classic three-process FSM (state register, next-state logic, registered outputs)
// using the state_q / state_d naming convention.
// @expect-type fsm
module three_process_fsm (
    input  logic       clk,
    input  logic       rst_n,
    input  logic       start,
    input  logic       done,
    input  logic       error,
    output logic       busy,
    output logic [1:0] status
);
    typedef enum logic [1:0] {IDLE, RUN, FINISH, FAULT} state_t;

    state_t state_q, state_d;

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) state_q <= IDLE;
        else        state_q <= state_d;
    end

    always_comb begin
        state_d = state_q;
        case (state_q)
            IDLE:    if (start) state_d = RUN;
            RUN:     if (error) state_d = FAULT;
                     else if (done) state_d = FINISH;
            FINISH:  state_d = IDLE;
            FAULT:   if (start) state_d = IDLE;
            default: state_d = IDLE;
        endcase
    end

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            busy   <= 1'b0;
            status <= 2'b00;
        end else begin
            busy   <= (state_d == RUN);
            status <= state_d;
        end
    end
endmodule
