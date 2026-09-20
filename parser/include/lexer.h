#ifndef SCHEMATEX_LEXER_H
#define SCHEMATEX_LEXER_H

#include "token.h"
#include <string>
#include <vector>
#include <memory>

namespace schematex {

class Lexer {
public:
    explicit Lexer(const std::string& input);

    // Tokenize the entire input and return a vector of tokens
    std::vector<Token> tokenize();

    // Get the next token
    Token nextToken();

    // Peek at the current character without consuming it
    char peek(int offset = 0) const;

    // Check if we've reached the end of input
    bool isAtEnd() const;

private:
    std::string input_;
    size_t position_;
    int line_;
    int column_;

    // Helper methods
    Token scanToken();
    Token scanNumber();
    Token scanIdentifierOrKeyword();
    Token scanString(char quote);
    Token scanOperatorOrDelimiter();

    char advance();
    bool match(char expected);
    bool isDigit(char c) const;
    bool isAlpha(char c) const;
    bool isAlphaNumeric(char c) const;
    bool isWhitespace(char c) const;
    void skipWhitespace();
    void skipLineComment();
    void skipBlockComment();

    TokenType getKeywordType(const std::string& text) const;
};

}  // namespace schematex

#endif  // SCHEMATEX_LEXER_H
