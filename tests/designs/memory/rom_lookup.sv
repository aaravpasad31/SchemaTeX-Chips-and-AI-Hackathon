// Combinational ROM from a constant array (sine quarter-wave table).
// @expect-type combinational
module rom_lookup (
    input  logic [3:0] addr,
    output logic [7:0] data
);
    localparam logic [7:0] TABLE [16] = '{
        8'd0,   8'd25,  8'd50,  8'd74,  8'd98,  8'd120, 8'd142, 8'd162,
        8'd180, 8'd197, 8'd212, 8'd225, 8'd236, 8'd244, 8'd250, 8'd254
    };

    assign data = TABLE[addr];
endmodule
