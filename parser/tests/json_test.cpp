#include "../include/json_serializer.h"
#include "../include/parser.h"
#include <iostream>
#include <cassert>
#include <sstream>

using namespace schematex;

// Simple JSON validator
bool isValidJSON(const std::string& json) {
    // Basic validation - check for balanced braces
    int braceCount = 0;
    int bracketCount = 0;
    bool inString = false;
    bool escaped = false;

    for (size_t i = 0; i < json.length(); ++i) {
        char c = json[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (c == '\\' && inString) {
            escaped = true;
            continue;
        }

        if (c == '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (c == '{') braceCount++;
            else if (c == '}') braceCount--;
            else if (c == '[') bracketCount++;
            else if (c == ']') bracketCount--;
        }
    }

    return braceCount == 0 && bracketCount == 0 && !inString;
}

bool testCounter4bitJSON() {
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
    assert(isValidJSON(json));
    assert(json.find("\"modules\"") != std::string::npos);
    assert(json.find("\"name\":\"counter_4bit\"") != std::string::npos);
    assert(json.find("\"filepath\":\"counter_4bit.sv\"") != std::string::npos);
    assert(json.find("\"ports\"") != std::string::npos);
    assert(json.find("\"signals\"") != std::string::npos);
    assert(json.find("\"blocks\"") != std::string::npos);
    assert(json.find("\"instances\"") != std::string::npos);
    assert(json.find("\"parameters\"") != std::string::npos);
    assert(json.find("\"errors\"") != std::string::npos);

    // Validate port information
    assert(json.find("\"name\":\"clk\"") != std::string::npos);
    assert(json.find("\"name\":\"reset\"") != std::string::npos);
    assert(json.find("\"name\":\"enable\"") != std::string::npos);
    assert(json.find("\"name\":\"count\"") != std::string::npos);
    assert(json.find("\"direction\":\"input\"") != std::string::npos);
    assert(json.find("\"direction\":\"output\"") != std::string::npos);

    // Validate signal information
    assert(json.find("\"name\":\"count_next\"") != std::string::npos);
    assert(json.find("\"type\":\"logic\"") != std::string::npos);

    // Validate block information
    assert(json.find("\"type\":\"always_comb\"") != std::string::npos);
    assert(json.find("\"type\":\"always_ff\"") != std::string::npos);

    std::cout << "counter_4bit JSON output:" << std::endl;
    std::cout << json << std::endl;

    return true;
}

bool testSimpleModuleJSON() {
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
    std::string json = JSONSerializer::serializeModule(module);

    assert(isValidJSON(json));
    assert(json.find("\"name\":\"simple\"") != std::string::npos);

    std::cout << "\nsimple module JSON output:" << std::endl;
    std::cout << json << std::endl;

    return true;
}

int main() {
    int passed = 0;
    int total = 0;

    #define RUN_TEST(test_name) \
        total++; \
        try { \
            if (test_name()) { \
                std::cout << "\n✓ " << #test_name << std::endl; \
                passed++; \
            } else { \
                std::cout << "\n✗ " << #test_name << std::endl; \
            } \
        } catch (const std::exception& e) { \
            std::cout << "\n✗ " << #test_name << " (exception: " << e.what() << ")" << std::endl; \
        }

    RUN_TEST(testSimpleModuleJSON);
    RUN_TEST(testCounter4bitJSON);

    std::cout << "\n\nTotal: " << passed << "/" << total << " tests passed" << std::endl;

    return (passed == total) ? 0 : 1;
}
