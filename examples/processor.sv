/**
 * Processor - Hierarchical module example for SchemaTeX T6 testing
 * Demonstrates hierarchical container with multiple child instances
 *
 * Architecture:
 * - processor (parent, hierarchical container)
 *   - alu_inst (ALU instance)
 *   - mem_ctrl_inst (Memory Controller instance)
 *   - cache_controller_inst (Cache Controller instance)
 *
 * Signals:
 * - Input: clk, reset, addr[31:0], data_in[31:0], rw
 * - Output: data_out[31:0], ready
 * - Internal: alu_out[31:0], mem_addr[31:0], cache_hit, mem_data[31:0]
 */

module processor (
    input  wire         clk,
    input  wire         reset,
    input  wire  [31:0] addr,
    input  wire  [31:0] data_in,
    input  wire         rw,
    output logic [31:0] data_out,
    output logic        ready
);

    // Internal signals
    wire [31:0] alu_out;
    wire [31:0] mem_addr;
    wire        cache_hit;
    wire [31:0] mem_data;
    wire [31:0] alu_in_a;
    wire [31:0] alu_in_b;
    wire [3:0]  alu_op;

    // ALU Instance
    alu alu_inst (
        .a(alu_in_a),
        .b(alu_in_b),
        .op(alu_op),
        .result(alu_out)
    );

    // Memory Controller Instance
    memory_controller mem_ctrl_inst (
        .clk(clk),
        .reset(reset),
        .addr(mem_addr),
        .data_in(alu_out),
        .rw(rw),
        .data_out(mem_data),
        .ready(ready)
    );

    // Cache Controller Instance
    cache_controller cache_controller_inst (
        .clk(clk),
        .reset(reset),
        .addr(addr),
        .mem_addr(mem_addr),
        .mem_data(mem_data),
        .cache_hit(cache_hit),
        .data_out(data_out)
    );

    // Control logic (combinational)
    always_comb begin
        alu_in_a = data_in;
        alu_in_b = addr;
        alu_op = 4'b0000;  // ADD operation

        if (cache_hit) begin
            // Use cached data
            data_out = mem_data;
        end
    end

endmodule

/**
 * ALU - Arithmetic Logic Unit
 * Simple combinational logic block
 */
module alu (
    input  wire [31:0] a,
    input  wire [31:0] b,
    input  wire [3:0]  op,
    output logic [31:0] result
);

    always_comb begin
        case (op)
            4'b0000: result = a + b;      // ADD
            4'b0001: result = a - b;      // SUB
            4'b0010: result = a & b;      // AND
            4'b0011: result = a | b;      // OR
            4'b0100: result = a ^ b;      // XOR
            default: result = 32'b0;
        endcase
    end

endmodule

/**
 * Memory Controller - Manages memory access
 * Sequential logic with state
 */
module memory_controller (
    input  wire         clk,
    input  wire         reset,
    input  wire  [31:0] addr,
    input  wire  [31:0] data_in,
    input  wire         rw,
    output logic [31:0] data_out,
    output logic        ready
);

    // Memory storage (simplified)
    logic [31:0] mem [0:255];
    logic [7:0]  mem_addr_reg;

    always_ff @(posedge clk) begin
        if (reset) begin
            ready <= 1'b0;
            mem_addr_reg <= 8'b0;
        end else begin
            mem_addr_reg <= addr[7:0];

            if (rw) begin
                // Write operation
                mem[addr[7:0]] <= data_in;
                ready <= 1'b1;
            end else begin
                // Read operation
                data_out <= mem[addr[7:0]];
                ready <= 1'b1;
            end
        end
    end

endmodule

/**
 * Cache Controller - Manages L1 cache
 * Combinational logic
 */
module cache_controller (
    input  wire  [31:0] addr,
    input  wire  [31:0] mem_addr,
    input  wire  [31:0] mem_data,
    input  wire         clk,
    input  wire         reset,
    output logic        cache_hit,
    output logic [31:0] data_out
);

    // Simple cache tag storage
    logic [31:0] cache_tags [0:31];
    logic [31:0] cache_data [0:31];
    logic [4:0]  cache_addr;

    assign cache_addr = addr[6:2];  // Cache line address

    always_comb begin
        // Check for cache hit
        if (cache_tags[cache_addr] == addr) begin
            cache_hit = 1'b1;
            data_out = cache_data[cache_addr];
        end else begin
            cache_hit = 1'b0;
            data_out = mem_data;
        end
    end

endmodule
