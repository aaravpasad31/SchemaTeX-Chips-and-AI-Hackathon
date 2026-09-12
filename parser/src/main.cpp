#include "../include/lexer.h"
#include "../include/parser.h"
#include "../include/json_serializer.h"
#include <iostream>
#include <fstream>
#include <sstream>

using namespace schematex;

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: schematex-parser <input.sv>" << std::endl;
        return 1;
    }

    std::string filename = argv[1];

    // Read the input file
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Error: Cannot open file '" << filename << "'" << std::endl;
        return 1;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string input = buffer.str();

    // Parse the input
    Parser parser(input);
    ModulePtr module = parser.parse();

    // If we have errors, output them to stderr
    if (parser.hasErrors()) {
        for (const auto& error : parser.getErrors()) {
            std::cerr << error << std::endl;
        }
    }

    if (!module) {
        // Output empty JSON structure with error on stderr
        std::cerr << "1:1: Failed to parse module" << std::endl;
        std::cout << R"({"modules":[],"errors":[]})" << std::endl;
        return 1;
    }

    // Serialize to JSON and output to stdout
    std::string json = JSONSerializer::serializeModule(module);
    std::cout << json << std::endl;

    // Return 0 even if there were parsing errors, as we still output the JSON
    return parser.hasErrors() ? 1 : 0;
}
