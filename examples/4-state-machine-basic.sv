/**
 * Test Case 4: STATE MACHINE BLOCK TYPE
 *
 * Component: Explicit FSM with enum state register and case statement
 * Expected: State circles with transitions as arrows between them
 * Spec: IEEE 91-1984, state diagram with labeled transitions
 */

module traffic_light_fsm (
    input  wire clk,
    input  wire reset,
    input  wire sensor,
    output logic red,
    output logic yellow,
    output logic green
);

    // Explicit enum for state
    enum logic [1:0] {
        RED    = 2'b00,
        YELLOW = 2'b01,
        GREEN  = 2'b10
    } state, next_state;

    // Combinational next-state logic
    always_comb begin
        case (state)
            RED:    next_state = (sensor) ? GREEN : RED;
            GREEN:  next_state = YELLOW;
            YELLOW: next_state = RED;
            default: next_state = RED;
        endcase
    end

    // Sequential state update
    always_ff @(posedge clk or negedge reset) begin
        if (!reset)
            state <= RED;
        else
            state <= next_state;
    end

    // Output logic
    always_comb begin
        red    = (state == RED);
        yellow = (state == YELLOW);
        green  = (state == GREEN);
    end

endmodule
