// A small single-cycle CPU: program counter, instruction ROM, decoder, register file,
// ALU and data memory. A realistic mixed design with several levels and many nets.
// @expect-type mixed
// @expect-instances 5
// @expect-net u_imem.instr -> u_decode.instr
// @expect-net u_decode.rs1 -> u_rf.raddr_a
// @expect-net u_rf.rdata_a -> u_alu.a
// @expect-net u_alu.y -> u_dmem.addr
module mini_cpu (
    input  logic        clk,
    input  logic        rst,
    output logic [31:0] debug_pc,
    output logic [31:0] debug_result
);
    logic [31:0] pc, pc_next, instr;
    logic [4:0]  rs1, rs2, rd;
    logic [31:0] imm, rdata_a, rdata_b, alu_b, alu_y, mem_rdata, wb_data;
    logic [2:0]  alu_op;
    logic        reg_we, mem_we, use_imm, mem_to_reg, is_branch, zero;

    always_ff @(posedge clk) begin
        if (rst) pc <= '0;
        else     pc <= pc_next;
    end

    assign pc_next = (is_branch && zero) ? pc + imm : pc + 32'd4;

    instr_rom u_imem (.addr(pc), .instr);

    decoder u_decode (
        .instr, .rs1, .rs2, .rd, .imm, .alu_op,
        .reg_we, .mem_we, .use_imm, .mem_to_reg, .is_branch
    );

    regfile u_rf (
        .clk,
        .we     (reg_we),
        .waddr  (rd),
        .wdata  (wb_data),
        .raddr_a(rs1),
        .raddr_b(rs2),
        .rdata_a,
        .rdata_b
    );

    assign alu_b = use_imm ? imm : rdata_b;

    cpu_alu u_alu (.a(rdata_a), .b(alu_b), .op(alu_op), .y(alu_y), .zero);

    data_ram u_dmem (.clk, .we(mem_we), .addr(alu_y), .wdata(rdata_b), .rdata(mem_rdata));

    assign wb_data      = mem_to_reg ? mem_rdata : alu_y;
    assign debug_pc     = pc;
    assign debug_result = wb_data;
endmodule

module instr_rom (
    input  logic [31:0] addr,
    output logic [31:0] instr
);
    logic [31:0] rom [64];
    initial for (int i = 0; i < 64; i++) rom[i] = 32'h0000_0013;
    assign instr = rom[addr[7:2]];
endmodule

module decoder (
    input  logic [31:0] instr,
    output logic [4:0]  rs1, rs2, rd,
    output logic [31:0] imm,
    output logic [2:0]  alu_op,
    output logic        reg_we, mem_we, use_imm, mem_to_reg, is_branch
);
    logic [6:0] opcode;

    assign opcode = instr[6:0];
    assign rs1    = instr[19:15];
    assign rs2    = instr[24:20];
    assign rd     = instr[11:7];

    always_comb begin
        imm        = {{20{instr[31]}}, instr[31:20]};
        alu_op     = instr[14:12];
        reg_we     = 1'b0;
        mem_we     = 1'b0;
        use_imm    = 1'b0;
        mem_to_reg = 1'b0;
        is_branch  = 1'b0;
        case (opcode)
            7'b0110011: reg_we = 1'b1;
            7'b0010011: begin reg_we = 1'b1; use_imm = 1'b1; end
            7'b0000011: begin reg_we = 1'b1; use_imm = 1'b1; mem_to_reg = 1'b1; alu_op = 3'd0; end
            7'b0100011: begin mem_we = 1'b1; use_imm = 1'b1; alu_op = 3'd0;
                              imm = {{20{instr[31]}}, instr[31:25], instr[11:7]}; end
            7'b1100011: begin is_branch = 1'b1; alu_op = 3'd1;
                              imm = {{19{instr[31]}}, instr[31], instr[7], instr[30:25], instr[11:8], 1'b0}; end
            default: ;
        endcase
    end
endmodule

module regfile (
    input  logic        clk,
    input  logic        we,
    input  logic [4:0]  waddr,
    input  logic [31:0] wdata,
    input  logic [4:0]  raddr_a,
    input  logic [4:0]  raddr_b,
    output logic [31:0] rdata_a,
    output logic [31:0] rdata_b
);
    logic [31:0] regs [32];

    always_ff @(posedge clk) if (we && waddr != 5'd0) regs[waddr] <= wdata;

    assign rdata_a = (raddr_a == 5'd0) ? 32'd0 : regs[raddr_a];
    assign rdata_b = (raddr_b == 5'd0) ? 32'd0 : regs[raddr_b];
endmodule

module cpu_alu (
    input  logic [31:0] a,
    input  logic [31:0] b,
    input  logic [2:0]  op,
    output logic [31:0] y,
    output logic        zero
);
    always_comb begin
        case (op)
            3'd0:    y = a + b;
            3'd1:    y = a - b;
            3'd4:    y = a ^ b;
            3'd6:    y = a | b;
            3'd7:    y = a & b;
            default: y = a + b;
        endcase
    end
    assign zero = (y == 32'd0);
endmodule

module data_ram (
    input  logic        clk,
    input  logic        we,
    input  logic [31:0] addr,
    input  logic [31:0] wdata,
    output logic [31:0] rdata
);
    logic [31:0] mem [256];
    always_ff @(posedge clk) if (we) mem[addr[9:2]] <= wdata;
    assign rdata = mem[addr[9:2]];
endmodule
