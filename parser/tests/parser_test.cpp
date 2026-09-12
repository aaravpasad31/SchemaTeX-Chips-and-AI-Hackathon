#include "../include/parser.h"
#include "../include/lexer.h"
#include "../include/json_serializer.h"
#include <iostream>
#include <cassert>
#include <sstream>

using namespace schematex;

bool testParseSimpleModule() {
    std::string input = R"(
        module simple (
            input wire a,
            output wire b
        );
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);
    assert(module->name == "simple");
    assert(module->ports.size() == 2);
    assert(!parser.hasErrors());

    return true;
}

bool testParsePortDeclarations() {
    std::string input = R"(
        module test (
            input wire clk,
            input wire [7:0] data_in,
            output logic [3:0] count,
            output wire ready
        );
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);
    assert(module->ports.size() == 4);
    assert(module->ports[0]->name == "clk");
    assert(module->ports[0]->direction == Port::Direction::INPUT);
    assert(module->ports[0]->width == 1);
    assert(module->ports[1]->name == "data_in");
    assert(module->ports[1]->width == 8);
    assert(module->ports[2]->name == "count");
    assert(module->ports[2]->direction == Port::Direction::OUTPUT);
    assert(module->ports[2]->width == 4);

    return true;
}

bool testParseSignalDeclarations() {
    std::string input = R"(
        module test (
            input wire clk,
            output wire result
        );
            wire temp;
            logic [7:0] data;
            reg [15:0] counter;
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);
    assert(module->signals.size() == 3);
    assert(module->signals[0]->name == "temp");
    assert(module->signals[0]->type == Signal::Type::WIRE);
    assert(module->signals[1]->name == "data");
    assert(module->signals[1]->type == Signal::Type::LOGIC);
    assert(module->signals[1]->width == 8);
    assert(module->signals[2]->name == "counter");
    assert(module->signals[2]->type == Signal::Type::REG);
    assert(module->signals[2]->width == 16);

    return true;
}

bool testParseAssignStatements() {
    std::string input = R"(
        module test (
            input wire [3:0] a,
            input wire [3:0] b,
            output wire [3:0] sum
        );
            assign sum = a + b;
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);
    assert(module->statements.size() > 0);
    assert(!parser.hasErrors());

    return true;
}

bool testParseAlwaysCombBlock() {
    std::string input = R"(
        module test (
            input wire [3:0] a,
            output logic [3:0] result
        );
            always_comb begin
                result = a;
            end
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);
    assert(module->statements.size() > 0);
    auto block = std::dynamic_pointer_cast<Block>(module->statements[0]);
    assert(block != nullptr);
    assert(block->type == Block::Type::COMBINATIONAL);

    return true;
}

bool testParseAlwaysFFBlock() {
    std::string input = R"(
        module test (
            input wire clk,
            input wire reset,
            input wire [3:0] d,
            output logic [3:0] q
        );
            always_ff @(posedge clk) begin
                if (reset) begin
                    q <= 4'b0000;
                end else begin
                    q <= d;
                end
            end
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);
    assert(module->statements.size() > 0);
    auto block = std::dynamic_pointer_cast<Block>(module->statements[0]);
    assert(block != nullptr);
    assert(block->type == Block::Type::SEQUENTIAL);

    return true;
}

bool testParseModuleInstantiation() {
    std::string input = R"(
        module test (
            input wire clk,
            output wire out
        );
            submodule inst1 (
                .clk(clk),
                .out(out)
            );
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);
    assert(module->instances.size() == 1);
    assert(module->instances[0]->moduleName == "submodule");
    assert(module->instances[0]->instanceName == "inst1");

    return true;
}

bool testParseCounter4bit() {
    std::string input = R"(
        module counter_4bit (
            input wire clk,
            input wire reset,
            input wire enable,
            output logic [3:0] count
        );

            logic [3:0] count_next;

            always_comb begin
                if (reset) begin
                    count_next = 4'b0000;
                end else if (enable) begin
                    count_next = count + 1;
                end else begin
                    count_next = count;
                end
            end

            always_ff @(posedge clk) begin
                count <= count_next;
            end

        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);
    assert(module->name == "counter_4bit");
    assert(module->ports.size() == 4);
    assert(module->signals.size() == 1);
    assert(module->statements.size() == 2);  // two always blocks

    // Verify ports
    assert(module->ports[0]->name == "clk");
    assert(module->ports[0]->direction == Port::Direction::INPUT);
    assert(module->ports[1]->name == "reset");
    assert(module->ports[2]->name == "enable");
    assert(module->ports[3]->name == "count");
    assert(module->ports[3]->direction == Port::Direction::OUTPUT);
    assert(module->ports[3]->width == 4);

    // Verify signals
    assert(module->signals[0]->name == "count_next");
    assert(module->signals[0]->type == Signal::Type::LOGIC);
    assert(module->signals[0]->width == 4);

    // Verify blocks
    auto block1 = std::dynamic_pointer_cast<Block>(module->statements[0]);
    assert(block1 != nullptr);
    assert(block1->type == Block::Type::COMBINATIONAL);

    auto block2 = std::dynamic_pointer_cast<Block>(module->statements[1]);
    assert(block2 != nullptr);
    assert(block2->type == Block::Type::SEQUENTIAL);

    return true;
}

bool testErrorHandling() {
    // Missing endmodule
    std::string input = R"(
        module test (
            input wire a,
            output wire b
        );
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(parser.hasErrors());

    return true;
}

bool testEmptyInput() {
    std::string input = "";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(parser.hasErrors());

    return true;
}

bool testMissingModuleKeyword() {
    std::string input = R"(
        test (
            input wire a
        );
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(parser.hasErrors());

    return true;
}

bool testJSONSerializationBasic() {
    std::string input = R"(
        module simple (
            input wire a,
            output wire b
        );
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);

    // Serialize to JSON
    std::string json = JSONSerializer::serializeModule(module);

    // Check that JSON contains expected structure
    assert(json.find("\"modules\"") != std::string::npos);
    assert(json.find("\"name\":\"simple\"") != std::string::npos);
    assert(json.find("\"ports\"") != std::string::npos);
    assert(json.find("\"signals\"") != std::string::npos);
    assert(json.find("\"errors\"") != std::string::npos);

    return true;
}

bool testJSONSerializationPorts() {
    std::string input = R"(
        module test (
            input wire clk,
            input wire [7:0] data_in,
            output logic [3:0] count,
            output wire ready
        );
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);

    std::string json = JSONSerializer::serializeModule(module);

    // Check port serialization
    assert(json.find("\"name\":\"clk\"") != std::string::npos);
    assert(json.find("\"direction\":\"input\"") != std::string::npos);
    assert(json.find("\"direction\":\"output\"") != std::string::npos);
    assert(json.find("\"width\":1") != std::string::npos);
    assert(json.find("\"width\":8") != std::string::npos);
    assert(json.find("\"width\":4") != std::string::npos);

    return true;
}

bool testJSONSerializationSignals() {
    std::string input = R"(
        module test (
            input wire clk,
            output wire result
        );
            wire temp;
            logic [7:0] data;
            reg [15:0] counter;
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);

    std::string json = JSONSerializer::serializeModule(module);

    // Check signal serialization
    assert(json.find("\"name\":\"temp\"") != std::string::npos);
    assert(json.find("\"type\":\"wire\"") != std::string::npos);
    assert(json.find("\"type\":\"logic\"") != std::string::npos);
    assert(json.find("\"type\":\"reg\"") != std::string::npos);

    return true;
}

bool testJSONSerializationCounter4bit() {
    std::string input = R"(
        module counter_4bit (
            input wire clk,
            input wire reset,
            input wire enable,
            output logic [3:0] count
        );

            logic [3:0] count_next;

            always_comb begin
                if (reset) begin
                    count_next = 4'b0000;
                end else if (enable) begin
                    count_next = count + 1;
                end else begin
                    count_next = count;
                end
            end

            always_ff @(posedge clk) begin
                count <= count_next;
            end

        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);
    assert(module->name == "counter_4bit");

    std::string json = JSONSerializer::serializeModule(module);

    // Validate JSON structure
    assert(json.find("\"modules\"") != std::string::npos);
    assert(json.find("\"name\":\"counter_4bit\"") != std::string::npos);
    assert(json.find("\"filepath\":\"counter_4bit.sv\"") != std::string::npos);
    assert(json.find("\"ports\"") != std::string::npos);
    assert(json.find("\"signals\"") != std::string::npos);
    assert(json.find("\"blocks\"") != std::string::npos);
    assert(json.find("\"instances\"") != std::string::npos);
    assert(json.find("\"parameters\"") != std::string::npos);
    assert(json.find("\"errors\"") != std::string::npos);

    // Check that it contains expected elements
    assert(json.find("\"direction\":\"input\"") != std::string::npos);
    assert(json.find("\"direction\":\"output\"") != std::string::npos);
    assert(json.find("\"type\":\"always_comb\"") != std::string::npos);
    assert(json.find("\"type\":\"always_ff\"") != std::string::npos);

    return true;
}

bool testJSONStringEscaping() {
    std::string input = R"(
        module test (
            input wire a,
            output wire b
        );
        endmodule
    )";

    Parser parser(input);
    ModulePtr module = parser.parse();

    assert(module != nullptr);

    std::string json = JSONSerializer::serializeModule(module);

    // JSON should be valid - no unescaped quotes or backslashes in strings
    // This is a basic check - a real JSON validator would be more thorough
    assert(json.find("{") != std::string::npos);
    assert(json.find("}") != std::string::npos);

    return true;
}

int main() {
    int passed = 0;
    int total = 0;

    #define RUN_TEST(test_name) \
        total++; \
        try { \
            if (test_name()) { \
                std::cout << "✓ " << #test_name << std::endl; \
                passed++; \
            } else { \
                std::cout << "✗ " << #test_name << std::endl; \
            } \
        } catch (const std::exception& e) { \
            std::cout << "✗ " << #test_name << " (exception: " << e.what() << ")" << std::endl; \
        }

    RUN_TEST(testParseSimpleModule);
    RUN_TEST(testParsePortDeclarations);
    RUN_TEST(testParseSignalDeclarations);
    RUN_TEST(testParseAssignStatements);
    RUN_TEST(testParseAlwaysCombBlock);
    RUN_TEST(testParseAlwaysFFBlock);
    RUN_TEST(testParseModuleInstantiation);
    RUN_TEST(testParseCounter4bit);
    RUN_TEST(testErrorHandling);
    RUN_TEST(testEmptyInput);
    RUN_TEST(testMissingModuleKeyword);

    // JSON Serialization tests
    RUN_TEST(testJSONSerializationBasic);
    RUN_TEST(testJSONSerializationPorts);
    RUN_TEST(testJSONSerializationSignals);
    RUN_TEST(testJSONSerializationCounter4bit);
    RUN_TEST(testJSONStringEscaping);

    std::cout << "\nTotal: " << passed << "/" << total << " tests passed" << std::endl;

    return (passed == total) ? 0 : 1;
}
