// Types shared through a package: an enum for FSM state and a packed struct for a bus.
// The FSM uses the package's enum, so it should still classify as a state machine.
// @expect-type fsm
package bus_pkg;
    typedef enum logic [1:0] {IDLE, REQ, WAIT_ACK, DONE} state_t;

    typedef struct packed {
        logic [15:0] addr;
        logic [31:0] data;
        logic        write;
    } request_t;

    localparam logic [3:0] TIMEOUT = 4'd15;
endpackage

module package_types
    import bus_pkg::*;
(
    input  logic     clk,
    input  logic     rst,
    input  logic     go,
    input  request_t req_in,
    input  logic     ack,
    output request_t req_out,
    output logic     valid,
    output logic     timed_out
);
    state_t     state;
    logic [3:0] timer;

    always_ff @(posedge clk) begin
        if (rst) begin
            state <= IDLE;
            timer <= '0;
        end else begin
            case (state)
                IDLE:     if (go) begin state <= REQ; req_out <= req_in; end
                REQ:      begin state <= WAIT_ACK; timer <= '0; end
                WAIT_ACK: if (ack || timer == TIMEOUT) state <= DONE;
                          else timer <= timer + 1'b1;
                DONE:     state <= IDLE;
                default:  state <= IDLE;
            endcase
        end
    end

    assign valid     = (state == REQ) || (state == WAIT_ACK);
    assign timed_out = (state == DONE) && !ack;
endmodule
