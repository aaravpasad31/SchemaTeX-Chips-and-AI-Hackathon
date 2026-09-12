#ifndef SCHEMATEX_TOKEN_H
#define SCHEMATEX_TOKEN_H

#include <string>

namespace schematex {

enum class TokenType {
    // Keywords
    KW_MODULE,
    KW_ENDMODULE,
    KW_INPUT,
    KW_OUTPUT,
    KW_INOUT,
    KW_WIRE,
    KW_REG,
    KW_LOGIC,
    KW_ASSIGN,
    KW_ALWAYS,
    KW_ALWAYS_COMB,
    KW_ALWAYS_FF,
    KW_IF,
    KW_ELSE,
    KW_FOR,
    KW_BEGIN,
    KW_END,
    KW_GENERATE,
    KW_ENDGENERATE,
    KW_POSEDGE,
    KW_NEGEDGE,

    // Identifiers and literals
    IDENTIFIER,
    NUMBER,
    STRING,

    // Operators
    OP_ASSIGN,      // =
    OP_EQUAL,       // ==
    OP_NOT_EQUAL,   // !=
    OP_LESS,        // <
    OP_GREATER,     // >
    OP_LESS_EQUAL,  // <=
    OP_GREATER_EQUAL, // >=
    OP_AND,         // &&
    OP_OR,          // ||
    OP_NOT,         // !
    OP_BITWISE_AND, // &
    OP_BITWISE_OR,  // |
    OP_BITWISE_XOR, // ^
    OP_BITWISE_NOT, // ~
    OP_PLUS,        // +
    OP_MINUS,       // -
    OP_MUL,         // *
    OP_DIV,         // /
    OP_MOD,         // %
    OP_LSHIFT,      // <<
    OP_RSHIFT,      // >>
    OP_CONCAT,      // {
    OP_QUESTION,    // ?
    OP_COLON,       // :

    // Delimiters
    LPAREN,         // (
    RPAREN,         // )
    LBRACE,         // {
    RBRACE,         // }
    LBRACKET,       // [
    RBRACKET,       // ]
    SEMICOLON,      // ;
    COMMA,          // ,
    DOT,            // .
    HASH,           // #

    // Special
    NEWLINE,
    EOF_TOKEN,
    UNKNOWN
};

struct Token {
    TokenType type;
    std::string value;
    int line;
    int column;

    Token() : type(TokenType::UNKNOWN), value(""), line(0), column(0) {}

    Token(TokenType t, const std::string& v, int l, int c)
        : type(t), value(v), line(l), column(c) {}
};

}  // namespace schematex

#endif  // SCHEMATEX_TOKEN_H
