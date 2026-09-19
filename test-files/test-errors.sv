// Test file with intentional errors for testing error handling

module faulty_counter (
	input clk,
	input rst,
	output [7:0] count
);
	reg [7:0] counter;

	// Missing always keyword - syntax error
	@(posedge clk or posedge rst) begin
		if (rst)
			counter <= 8'b0;
		else
			counter <= counter + 1;
	end

	// Unsupported SystemVerilog 3.0 construct
	assign count = counter;

	// Missing semicolon - syntax error
	reg [15:0] extra_signal

	// Unknown identifier
	wire [7:0] invalid_signal = some_undefined_signal + 5;

// Missing endmodule keyword - parse error
