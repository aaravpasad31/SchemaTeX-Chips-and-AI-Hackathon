// SPI master (mode 0): clock divider, shift register and a transfer FSM.
// @expect-type fsm
module spi_master #(
    parameter int DIV = 4
) (
    input  logic       clk,
    input  logic       rst_n,
    input  logic       start,
    input  logic [7:0] mosi_data,
    output logic [7:0] miso_data,
    output logic       done,
    output logic       sclk,
    output logic       mosi,
    input  logic       miso,
    output logic       cs_n
);
    typedef enum logic [1:0] {IDLE, TRANSFER, FINISH} state_t;

    localparam logic [$clog2(DIV)-1:0] DIV_LAST = $clog2(DIV)'(DIV - 1);

    state_t                 state;
    logic [$clog2(DIV)-1:0] div_cnt;
    logic [2:0]             bit_cnt;
    logic [7:0]             tx_shift, rx_shift;
    logic                   sclk_en;

    wire half_period = (div_cnt == DIV_LAST);

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n)                   div_cnt <= '0;
        else if (!sclk_en || half_period) div_cnt <= '0;
        else                          div_cnt <= div_cnt + 1'b1;
    end

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state    <= IDLE;
            sclk     <= 1'b0;
            bit_cnt  <= '0;
            tx_shift <= '0;
            rx_shift <= '0;
            done     <= 1'b0;
        end else begin
            done <= 1'b0;
            case (state)
                IDLE: if (start) begin
                    tx_shift <= mosi_data;
                    bit_cnt  <= '0;
                    state    <= TRANSFER;
                end
                TRANSFER: if (half_period) begin
                    sclk <= ~sclk;
                    if (!sclk) begin
                        rx_shift <= {rx_shift[6:0], miso};
                    end else begin
                        tx_shift <= {tx_shift[6:0], 1'b0};
                        bit_cnt  <= bit_cnt + 1'b1;
                        if (bit_cnt == 3'd7) state <= FINISH;
                    end
                end
                FINISH: begin
                    done  <= 1'b1;
                    state <= IDLE;
                end
                default: state <= IDLE;
            endcase
        end
    end

    assign sclk_en   = (state == TRANSFER);
    assign mosi      = tx_shift[7];
    assign cs_n      = (state == IDLE);
    assign miso_data = rx_shift;
endmodule
