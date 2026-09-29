/**
 * Traffic light controller: a three-state FSM with a timer.
 */
module traffic_light (
    input  logic clk,
    input  logic reset,
    input  logic car_waiting,
    output logic red,
    output logic yellow,
    output logic green
);

    typedef enum logic [1:0] {RED, GREEN, YELLOW} state_t;

    state_t     state, next_state;
    logic [3:0] timer;

    always_ff @(posedge clk) begin
        if (reset) begin
            state <= RED;
            timer <= '0;
        end else begin
            state <= next_state;
            timer <= (state == next_state) ? timer + 1 : '0;
        end
    end

    always_comb begin
        next_state = state;
        case (state)
            RED:    if (car_waiting && timer == 4'd9) next_state = GREEN;
            GREEN:  if (timer == 4'd14)               next_state = YELLOW;
            YELLOW: if (timer == 4'd3)                next_state = RED;
            default:                                  next_state = RED;
        endcase
    end

    assign red    = (state == RED);
    assign yellow = (state == YELLOW);
    assign green  = (state == GREEN);

endmodule
