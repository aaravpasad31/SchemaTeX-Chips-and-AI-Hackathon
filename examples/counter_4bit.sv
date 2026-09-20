// 4-bit Counter with Synchronous Reset
// Validation example for SchemaTeX

module counter_4bit (
    input wire clk,
    input wire reset,
    input wire enable,
    output logic [3:0] count
);

    // Internal counter storage
    logic [3:0] count_next;

    // Combinational logic: compute next count value
    always_comb begin
        if (reset) begin
            count_next = 4'b0000;
        end else if (enable) begin
            count_next = count + 1;
        end else begin
            count_next = count;
        end
    end

    // Sequential logic: update count on clock edge
    always_ff @(posedge clk) begin
        count <= count_next;
    end

endmodule
