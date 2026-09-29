// Round-robin arbiter with a rotating priority pointer.
// @expect-type sequential
module round_robin_arbiter #(
    parameter int N = 4
) (
    input  logic         clk,
    input  logic         rst_n,
    input  logic [N-1:0] req,
    output logic [N-1:0] grant
);
    logic [$clog2(N)-1:0] ptr;

    always_comb begin
        grant = '0;
        for (int i = 0; i < N; i++) begin
            automatic int idx = (int'(ptr) + i) % N;
            if (req[idx] && grant == '0) grant[idx] = 1'b1;
        end
    end

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) ptr <= '0;
        else begin
            for (int i = 0; i < N; i++) begin
                if (grant[i]) ptr <= $clog2(N)'(unsigned'((i + 1) % N));
            end
        end
    end
endmodule
