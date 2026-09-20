#include "../include/lexer.h"
#include <iostream>
#include <cassert>

using namespace schematex;

int testsPassed = 0;
int testsFailed = 0;

void assert_equal(const std::string& test_name, TokenType actual, TokenType expected) {
    if (actual == expected) {
        testsPassed++;
        std::cout << "✓ " << test_name << std::endl;
    } else {
        testsFailed++;
        std::cout << "✗ " << test_name << " - Expected type " << static_cast<int>(expected)
                  << ", got " << static_cast<int>(actual) << std::endl;
    }
}

void assert_token(const std::string& test_name, const Token& token, TokenType expectedType, const std::string& expectedValue) {
    if (token.type == expectedType && token.value == expectedValue) {
        testsPassed++;
        std::cout << "✓ " << test_name << std::endl;
    } else {
        testsFailed++;
        std::cout << "✗ " << test_name << " - Expected (" << static_cast<int>(expectedType) << ", '" << expectedValue
                  << "'), got (" << static_cast<int>(token.type) << ", '" << token.value << "')" << std::endl;
    }
}

void test_keywords() {
    std::cout << "\n=== Testing Keywords ===" << std::endl;

    Lexer lexer1("module input output inout wire reg assign always always_comb always_ff if else for begin end endmodule");
    auto tokens = lexer1.tokenize();

    assert_equal("module keyword", tokens[0].type, TokenType::KW_MODULE);
    assert_equal("input keyword", tokens[1].type, TokenType::KW_INPUT);
    assert_equal("output keyword", tokens[2].type, TokenType::KW_OUTPUT);
    assert_equal("inout keyword", tokens[3].type, TokenType::KW_INOUT);
    assert_equal("wire keyword", tokens[4].type, TokenType::KW_WIRE);
    assert_equal("reg keyword", tokens[5].type, TokenType::KW_REG);
    assert_equal("assign keyword", tokens[6].type, TokenType::KW_ASSIGN);
    assert_equal("always keyword", tokens[7].type, TokenType::KW_ALWAYS);
    assert_equal("always_comb keyword", tokens[8].type, TokenType::KW_ALWAYS_COMB);
    assert_equal("always_ff keyword", tokens[9].type, TokenType::KW_ALWAYS_FF);
    assert_equal("if keyword", tokens[10].type, TokenType::KW_IF);
    assert_equal("else keyword", tokens[11].type, TokenType::KW_ELSE);
    assert_equal("for keyword", tokens[12].type, TokenType::KW_FOR);
    assert_equal("begin keyword", tokens[13].type, TokenType::KW_BEGIN);
    assert_equal("end keyword", tokens[14].type, TokenType::KW_END);
    assert_equal("endmodule keyword", tokens[15].type, TokenType::KW_ENDMODULE);
}

void test_identifiers() {
    std::cout << "\n=== Testing Identifiers ===" << std::endl;

    Lexer lexer("counter clk reset enable my_var _internal $display");
    auto tokens = lexer.tokenize();

    assert_token("simple identifier", tokens[0], TokenType::IDENTIFIER, "counter");
    assert_token("short identifier", tokens[1], TokenType::IDENTIFIER, "clk");
    assert_token("identifier with underscore", tokens[3], TokenType::IDENTIFIER, "enable");
    assert_token("identifier starting with underscore", tokens[5], TokenType::IDENTIFIER, "_internal");
}

void test_decimal_numbers() {
    std::cout << "\n=== Testing Decimal Numbers ===" << std::endl;

    Lexer lexer("0 123 4095 999999");
    auto tokens = lexer.tokenize();

    assert_token("zero", tokens[0], TokenType::NUMBER, "0");
    assert_token("simple number", tokens[1], TokenType::NUMBER, "123");
    assert_token("larger number", tokens[2], TokenType::NUMBER, "4095");
    assert_token("large number", tokens[3], TokenType::NUMBER, "999999");
}

void test_binary_numbers() {
    std::cout << "\n=== Testing Binary Numbers ===" << std::endl;

    Lexer lexer("4'b0000 4'b1010 8'b11110000 4'B0101");
    auto tokens = lexer.tokenize();

    assert_token("4-bit binary", tokens[0], TokenType::NUMBER, "4'b0000");
    assert_token("binary number", tokens[1], TokenType::NUMBER, "4'b1010");
    assert_token("8-bit binary", tokens[2], TokenType::NUMBER, "8'b11110000");
    assert_token("uppercase B", tokens[3], TokenType::NUMBER, "4'B0101");
}

void test_hex_numbers() {
    std::cout << "\n=== Testing Hex Numbers ===" << std::endl;

    Lexer lexer("16'hABCD 32'h12345678 8'hFF");
    auto tokens = lexer.tokenize();

    assert_token("16-bit hex", tokens[0], TokenType::NUMBER, "16'hABCD");
    assert_token("32-bit hex", tokens[1], TokenType::NUMBER, "32'h12345678");
    assert_token("8-bit hex", tokens[2], TokenType::NUMBER, "8'hFF");
}

void test_operators() {
    std::cout << "\n=== Testing Operators ===" << std::endl;

    Lexer lexer("= == != < > <= >= && || ! & | ^ ~ + - * / %");
    auto tokens = lexer.tokenize();

    assert_equal("assignment", tokens[0].type, TokenType::OP_ASSIGN);
    assert_equal("equal", tokens[1].type, TokenType::OP_EQUAL);
    assert_equal("not equal", tokens[2].type, TokenType::OP_NOT_EQUAL);
    assert_equal("less than", tokens[3].type, TokenType::OP_LESS);
    assert_equal("greater than", tokens[4].type, TokenType::OP_GREATER);
    assert_equal("less equal", tokens[5].type, TokenType::OP_LESS_EQUAL);
    assert_equal("greater equal", tokens[6].type, TokenType::OP_GREATER_EQUAL);
    assert_equal("logical and", tokens[7].type, TokenType::OP_AND);
    assert_equal("logical or", tokens[8].type, TokenType::OP_OR);
    assert_equal("logical not", tokens[9].type, TokenType::OP_NOT);
    assert_equal("bitwise and", tokens[10].type, TokenType::OP_BITWISE_AND);
    assert_equal("bitwise or", tokens[11].type, TokenType::OP_BITWISE_OR);
    assert_equal("bitwise xor", tokens[12].type, TokenType::OP_BITWISE_XOR);
    assert_equal("bitwise not", tokens[13].type, TokenType::OP_BITWISE_NOT);
    assert_equal("plus", tokens[14].type, TokenType::OP_PLUS);
    assert_equal("minus", tokens[15].type, TokenType::OP_MINUS);
    assert_equal("multiply", tokens[16].type, TokenType::OP_MUL);
    assert_equal("divide", tokens[17].type, TokenType::OP_DIV);
    assert_equal("modulo", tokens[18].type, TokenType::OP_MOD);
}

void test_shifts() {
    std::cout << "\n=== Testing Shift Operators ===" << std::endl;

    Lexer lexer("<< >>");
    auto tokens = lexer.tokenize();

    assert_equal("left shift", tokens[0].type, TokenType::OP_LSHIFT);
    assert_equal("right shift", tokens[1].type, TokenType::OP_RSHIFT);
}

void test_delimiters() {
    std::cout << "\n=== Testing Delimiters ===" << std::endl;

    Lexer lexer("( ) { } [ ] ; , . # : ?");
    auto tokens = lexer.tokenize();

    assert_equal("lparen", tokens[0].type, TokenType::LPAREN);
    assert_equal("rparen", tokens[1].type, TokenType::RPAREN);
    assert_equal("lbrace", tokens[2].type, TokenType::LBRACE);
    assert_equal("rbrace", tokens[3].type, TokenType::RBRACE);
    assert_equal("lbracket", tokens[4].type, TokenType::LBRACKET);
    assert_equal("rbracket", tokens[5].type, TokenType::RBRACKET);
    assert_equal("semicolon", tokens[6].type, TokenType::SEMICOLON);
    assert_equal("comma", tokens[7].type, TokenType::COMMA);
    assert_equal("dot", tokens[8].type, TokenType::DOT);
    assert_equal("hash", tokens[9].type, TokenType::HASH);
    assert_equal("colon", tokens[10].type, TokenType::OP_COLON);
    assert_equal("question", tokens[11].type, TokenType::OP_QUESTION);
}

void test_line_comments() {
    std::cout << "\n=== Testing Line Comments ===" << std::endl;

    Lexer lexer("module // This is a comment\nendmodule");
    auto tokens = lexer.tokenize();

    assert_equal("comment skipped - module", tokens[0].type, TokenType::KW_MODULE);
    assert_equal("comment skipped - endmodule", tokens[1].type, TokenType::KW_ENDMODULE);
}

void test_block_comments() {
    std::cout << "\n=== Testing Block Comments ===" << std::endl;

    Lexer lexer("module /* This is\na block comment */ endmodule");
    auto tokens = lexer.tokenize();

    assert_equal("block comment - module", tokens[0].type, TokenType::KW_MODULE);
    assert_equal("block comment - endmodule", tokens[1].type, TokenType::KW_ENDMODULE);
}

void test_strings() {
    std::cout << "\n=== Testing Strings ===" << std::endl;

    Lexer lexer("\"hello world\" \"test\\nstring\"");
    auto tokens = lexer.tokenize();

    assert_token("simple string", tokens[0], TokenType::STRING, "hello world");
    assert_token("string with escape", tokens[1], TokenType::STRING, "test\\nstring");
}

void test_counter_module() {
    std::cout << "\n=== Testing Counter Module ===" << std::endl;

    std::string code = R"(
module counter_4bit (
    input wire clk,
    input wire reset,
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

    Lexer lexer(code);
    auto tokens = lexer.tokenize();

    // Check key tokens from the counter module
    bool found_module = false;
    bool found_input = false;
    bool found_output = false;
    bool found_always_ff = false;
    bool found_binary = false;
    bool found_range = false;

    for (const auto& token : tokens) {
        if (token.type == TokenType::KW_MODULE) found_module = true;
        if (token.type == TokenType::KW_INPUT) found_input = true;
        if (token.type == TokenType::KW_OUTPUT) found_output = true;
        if (token.type == TokenType::KW_ALWAYS_FF) found_always_ff = true;
        if (token.type == TokenType::NUMBER && token.value == "4'b0000") found_binary = true;
        if (token.type == TokenType::LBRACKET) found_range = true;
    }

    if (found_module) {
        testsPassed++;
        std::cout << "✓ counter module has keyword" << std::endl;
    } else {
        testsFailed++;
        std::cout << "✗ counter module has keyword" << std::endl;
    }

    if (found_input) {
        testsPassed++;
        std::cout << "✓ counter module has input" << std::endl;
    } else {
        testsFailed++;
        std::cout << "✗ counter module has input" << std::endl;
    }

    if (found_output) {
        testsPassed++;
        std::cout << "✓ counter module has output" << std::endl;
    } else {
        testsFailed++;
        std::cout << "✗ counter module has output" << std::endl;
    }

    if (found_always_ff) {
        testsPassed++;
        std::cout << "✓ counter module has always_ff" << std::endl;
    } else {
        testsFailed++;
        std::cout << "✗ counter module has always_ff" << std::endl;
    }

    if (found_binary) {
        testsPassed++;
        std::cout << "✓ counter module has binary number" << std::endl;
    } else {
        testsFailed++;
        std::cout << "✗ counter module has binary number" << std::endl;
    }

    if (found_range) {
        testsPassed++;
        std::cout << "✓ counter module has range brackets" << std::endl;
    } else {
        testsFailed++;
        std::cout << "✗ counter module has range brackets" << std::endl;
    }
}

void test_eof() {
    std::cout << "\n=== Testing EOF ===" << std::endl;

    Lexer lexer("");
    auto tokens = lexer.tokenize();

    if (tokens.size() == 1 && tokens[0].type == TokenType::EOF_TOKEN) {
        testsPassed++;
        std::cout << "✓ empty input produces EOF" << std::endl;
    } else {
        testsFailed++;
        std::cout << "✗ empty input produces EOF" << std::endl;
    }
}

int main() {
    test_keywords();
    test_identifiers();
    test_decimal_numbers();
    test_binary_numbers();
    test_hex_numbers();
    test_operators();
    test_shifts();
    test_delimiters();
    test_line_comments();
    test_block_comments();
    test_strings();
    test_counter_module();
    test_eof();

    std::cout << "\n" << "===========================================" << std::endl;
    std::cout << "Tests passed: " << testsPassed << std::endl;
    std::cout << "Tests failed: " << testsFailed << std::endl;
    std::cout << "===========================================" << std::endl;

    return (testsFailed > 0) ? 1 : 0;
}
