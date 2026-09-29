// 6x6 systolic mesh of processing elements: data flows east, partial sums flow south,
// wired through 2-D unpacked arrays. 36 instances, each with 4 neighbour links.
// The boundary assigns make it mixed rather than purely hierarchical.
// @expect-type mixed
// @expect-instances 36
// @expect-net g_r[0].g_c[0].u_pe.east -> g_r[0].g_c[1].u_pe.west
// @expect-net g_r[0].g_c[0].u_pe.south -> g_r[1].g_c[0].u_pe.north
// @expect-no-net g_r[0].g_c[0].u_pe.east -> g_r[3].g_c[4].u_pe.west
module pe_mesh #(
    parameter int N = 6,
    parameter int W = 8
) (
    input  logic         clk,
    input  logic         rst,
    input  logic [W-1:0] a_in   [N],
    input  logic [W-1:0] psum_in[N],
    output logic [W-1:0] psum_out[N]
);
    logic [W-1:0] horiz [N][N+1];
    logic [W-1:0] vert  [N+1][N];

    for (genvar r = 0; r < N; r++) begin : g_r
        assign horiz[r][0] = a_in[r];
        for (genvar c = 0; c < N; c++) begin : g_c
            pe #(.W(W)) u_pe (
                .clk, .rst,
                .west (horiz[r][c]),
                .north(vert[r][c]),
                .east (horiz[r][c+1]),
                .south(vert[r+1][c])
            );
        end
    end

    for (genvar c = 0; c < N; c++) begin : g_io
        assign vert[0][c]  = psum_in[c];
        assign psum_out[c] = vert[N][c];
    end
endmodule

module pe #(
    parameter int W = 8
) (
    input  logic         clk,
    input  logic         rst,
    input  logic [W-1:0] west,
    input  logic [W-1:0] north,
    output logic [W-1:0] east,
    output logic [W-1:0] south
);
    always_ff @(posedge clk) begin
        if (rst) begin
            east  <= '0;
            south <= '0;
        end else begin
            east  <= west;
            south <= north + west;
        end
    end
endmodule
