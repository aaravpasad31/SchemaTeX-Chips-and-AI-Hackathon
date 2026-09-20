/**
 * Test Case 6: MIXED MODULE TYPE
 *
 * Component: Contains both child instances AND internal logic
 * Expected: Outer container with nested modules + internal logic blocks
 * Spec: IEEE 91-1984, hierarchical module with internal datapath
 */

module processor_with_control (
    input  wire       clk,
    input  wire       reset,
    input  wire [31:0] addr,
    input  wire [31:0] data_in,
    input  wire       write_en,
    output logic [31:0] data_out,
    output logic      ready
);

    // Internal signals
    wire [31:0] alu_result;
    wire [31:0] mem_data;
    wire        cache_hit;

    // Internal combinational logic
    assign ready = cache_hit;

    // Child instances
    alu_core alu_inst (
        .a(data_in),
        .b(addr),
        .result(alu_result)
    );

    memory_controller mem_inst (
        .clk(clk),
        .addr(addr),
        .data_in(alu_result),
        .write_en(write_en),
        .data_out(mem_data)
    );

    cache_controller cache_inst (
        .clk(clk),
        .reset(reset),
        .addr(addr),
        .mem_data(mem_data),
        .hit(cache_hit)
    );

    // Output mux logic
    always_comb begin
        if (cache_hit)
            data_out = mem_data;
        else
            data_out = alu_result;
    end

endmodule
