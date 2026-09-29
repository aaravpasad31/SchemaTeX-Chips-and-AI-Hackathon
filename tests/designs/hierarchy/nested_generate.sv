// Two nested generate loops building a 3x2 grid, wired row by row through a 2-D unpacked array.
// The per-row assigns make it mixed rather than purely hierarchical.
// @expect-type mixed
// @expect-instances 6
// @expect-net row_in -> assign@22.row_in[0]
// @expect-net assign@22.link[0][0] -> g_row[0].g_col[0].u_cell.din
// @expect-net g_row[0].g_col[0].u_cell.dout -> g_row[0].g_col[1].u_cell.din
// @expect-net g_row[2].g_col[1].u_cell.dout -> assign@26.link[2][2]
// @expect-net assign@26.row_out[2] -> row_out
// @expect-no-net g_row[0].g_col[0].u_cell.dout -> g_row[1].g_col[1].u_cell.din
module nested_generate #(
    parameter int ROWS = 3,
    parameter int COLS = 2
) (
    input  logic       clk,
    input  logic [7:0] row_in  [ROWS],
    output logic [7:0] row_out [ROWS]
);
    logic [7:0] link [ROWS][COLS+1];

    for (genvar r = 0; r < ROWS; r++) begin : g_row
        assign link[r][0] = row_in[r];
        for (genvar c = 0; c < COLS; c++) begin : g_col
            grid_cell u_cell (.clk, .din(link[r][c]), .dout(link[r][c+1]));
        end
        assign row_out[r] = link[r][COLS];
    end
endmodule

module grid_cell (
    input  logic       clk,
    input  logic [7:0] din,
    output logic [7:0] dout
);
    always_ff @(posedge clk) dout <= din + 8'd1;
endmodule
