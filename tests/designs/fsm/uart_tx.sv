// UART transmitter: 8N1 framing with a baud-rate counter and a bit index.
// @expect-type fsm
module uart_tx #(
    parameter int CLKS_PER_BIT = 868
) (
    input  logic       clk,
    input  logic       rst,
    input  logic       tx_start,
    input  logic [7:0] tx_data,
    output logic       tx,
    output logic       tx_busy,
    output logic       tx_done
);
    typedef enum logic [1:0] {IDLE, START, DATA, STOP} state_t;

    localparam int CW = $clog2(CLKS_PER_BIT);
    localparam logic [CW-1:0] BAUD_LAST = CW'(CLKS_PER_BIT - 1);

    state_t        state;
    logic [CW-1:0] baud_cnt;
    logic [2:0]    bit_idx;
    logic [7:0]    shift;

    wire baud_tick = (baud_cnt == BAUD_LAST);

    always_ff @(posedge clk) begin
        if (rst || state == IDLE || baud_tick) baud_cnt <= '0;
        else                                   baud_cnt <= baud_cnt + 1'b1;
    end

    always_ff @(posedge clk) begin
        tx_done <= 1'b0;
        if (rst) begin
            state   <= IDLE;
            bit_idx <= '0;
            shift   <= '0;
        end else begin
            case (state)
                IDLE: if (tx_start) begin
                    shift <= tx_data;
                    state <= START;
                end
                START: if (baud_tick) state <= DATA;
                DATA: if (baud_tick) begin
                    shift   <= shift >> 1;
                    bit_idx <= bit_idx + 1'b1;
                    if (bit_idx == 3'd7) state <= STOP;
                end
                STOP: if (baud_tick) begin
                    state   <= IDLE;
                    tx_done <= 1'b1;
                end
                default: state <= IDLE;
            endcase
        end
    end

    always_comb begin
        case (state)
            START:     tx = 1'b0;
            DATA:      tx = shift[0];
            IDLE, STOP: tx = 1'b1;
            default:   tx = 1'b1;
        endcase
    end

    assign tx_busy = (state != IDLE);
endmodule
