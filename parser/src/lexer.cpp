#include "../include/lexer.h"

namespace schematex {

Lexer::Lexer(const std::string& input)
    : input_(input), position_(0), line_(1), column_(1) {
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    while (!isAtEnd()) {
        Token token = nextToken();
        if (token.type != TokenType::NEWLINE) {
            tokens.push_back(token);
        }
        if (token.type == TokenType::EOF_TOKEN) {
            break;
        }
    }
    return tokens;
}

Token Lexer::nextToken() {
    skipWhitespace();

    if (isAtEnd()) {
        return Token(TokenType::EOF_TOKEN, "", line_, column_);
    }

    char c = peek();

    // Handle comments
    if (c == '/' && peek(1) == '/') {
        skipLineComment();
        return nextToken();  // Recursively get the next token
    }

    if (c == '/' && peek(1) == '*') {
        skipBlockComment();
        return nextToken();  // Recursively get the next token
    }

    // Handle identifiers and keywords
    if (isAlpha(c)) {
        return scanIdentifierOrKeyword();
    }

    // Handle numbers
    if (isDigit(c)) {
        return scanNumber();
    }

    // Handle strings
    if (c == '"') {
        return scanString('"');
    }

    if (c == '\'') {
        // Handle character/string literals starting with single quote
        int startLine = line_;
        int startCol = column_;

        // For sized numbers like 4'b0000, the quote is handled by scanNumber()
        // This case should only occur if the quote is NOT part of a sized number
        // In that case, it's likely a string with single quotes or a formatting literal
        return scanString('\'');
    }

    // Handle operators and delimiters
    return scanOperatorOrDelimiter();
}

char Lexer::peek(int offset) const {
    if (position_ + offset >= input_.size()) {
        return '\0';
    }
    return input_[position_ + offset];
}

bool Lexer::isAtEnd() const {
    return position_ >= input_.size();
}

char Lexer::advance() {
    if (isAtEnd()) {
        return '\0';
    }

    char c = input_[position_];
    position_++;

    if (c == '\n') {
        line_++;
        column_ = 1;
    } else {
        column_++;
    }

    return c;
}

bool Lexer::match(char expected) {
    if (isAtEnd()) {
        return false;
    }

    if (input_[position_] != expected) {
        return false;
    }

    advance();
    return true;
}

bool Lexer::isDigit(char c) const {
    return c >= '0' && c <= '9';
}

bool Lexer::isAlpha(char c) const {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' || c == '$';
}

bool Lexer::isAlphaNumeric(char c) const {
    return isAlpha(c) || isDigit(c);
}

bool Lexer::isWhitespace(char c) const {
    return c == ' ' || c == '\t' || c == '\r';
}

void Lexer::skipWhitespace() {
    while (!isAtEnd() && isWhitespace(peek())) {
        if (peek() == '\n') {
            break;  // Don't skip newlines, they might be significant
        }
        advance();
    }
}

void Lexer::skipLineComment() {
    // Skip //
    advance();
    advance();

    // Skip until end of line
    while (!isAtEnd() && peek() != '\n') {
        advance();
    }
}

void Lexer::skipBlockComment() {
    // Skip /*
    advance();
    advance();

    // Skip until */
    while (!isAtEnd()) {
        if (peek() == '*' && peek(1) == '/') {
            advance();  // Skip *
            advance();  // Skip /
            break;
        }
        advance();
    }
}

Token Lexer::scanIdentifierOrKeyword() {
    int startLine = line_;
    int startCol = column_;
    std::string text;

    while (!isAtEnd() && isAlphaNumeric(peek())) {
        text += advance();
    }

    TokenType type = getKeywordType(text);
    return Token(type, text, startLine, startCol);
}

Token Lexer::scanNumber() {
    int startLine = line_;
    int startCol = column_;
    std::string text;

    // Check for sized number: e.g., 4'b0101, 16'hABCD, 8'd255
    bool isSizedNumber = false;
    size_t apostrophePos = 0;

    // Look ahead to see if there's an apostrophe
    size_t tempPos = position_;
    while (tempPos < input_.size() && isDigit(input_[tempPos])) {
        tempPos++;
    }

    if (tempPos < input_.size() && input_[tempPos] == '\'') {
        // This is a sized number
        isSizedNumber = true;
        apostrophePos = tempPos;
    }

    // Read the size part (if any)
    while (!isAtEnd() && isDigit(peek())) {
        text += advance();
    }

    // Check for apostrophe and radix
    if (isSizedNumber && !isAtEnd() && peek() == '\'') {
        text += advance();  // Add apostrophe

        // Read the radix specifier (b, d, h, o, or just plain digits)
        if (!isAtEnd() && (peek() == 'b' || peek() == 'B' ||
                            peek() == 'd' || peek() == 'D' ||
                            peek() == 'h' || peek() == 'H' ||
                            peek() == 'o' || peek() == 'O')) {
            text += advance();
        }

        // Read the value with possible underscores for readability
        while (!isAtEnd() && (isAlphaNumeric(peek()) || peek() == '_')) {
            text += advance();
        }
    } else {
        // Regular decimal number
        while (!isAtEnd() && isDigit(peek())) {
            text += advance();
        }

        // Check for decimal point
        if (!isAtEnd() && peek() == '.' && isDigit(peek(1))) {
            text += advance();  // Add dot
            while (!isAtEnd() && isDigit(peek())) {
                text += advance();
            }
        }
    }

    return Token(TokenType::NUMBER, text, startLine, startCol);
}

Token Lexer::scanString(char quote) {
    int startLine = line_;
    int startCol = column_;
    std::string text;

    advance();  // Skip opening quote

    while (!isAtEnd() && peek() != quote) {
        if (peek() == '\\') {
            // Handle escape sequences
            text += advance();
            if (!isAtEnd()) {
                text += advance();
            }
        } else {
            text += advance();
        }
    }

    if (!isAtEnd()) {
        advance();  // Skip closing quote
    }

    return Token(TokenType::STRING, text, startLine, startCol);
}

Token Lexer::scanOperatorOrDelimiter() {
    int startLine = line_;
    int startCol = column_;
    char c = advance();

    switch (c) {
        case '(':
            return Token(TokenType::LPAREN, "(", startLine, startCol);
        case ')':
            return Token(TokenType::RPAREN, ")", startLine, startCol);
        case '{':
            return Token(TokenType::LBRACE, "{", startLine, startCol);
        case '}':
            return Token(TokenType::RBRACE, "}", startLine, startCol);
        case '[':
            return Token(TokenType::LBRACKET, "[", startLine, startCol);
        case ']':
            return Token(TokenType::RBRACKET, "]", startLine, startCol);
        case ';':
            return Token(TokenType::SEMICOLON, ";", startLine, startCol);
        case ',':
            return Token(TokenType::COMMA, ",", startLine, startCol);
        case '.':
            return Token(TokenType::DOT, ".", startLine, startCol);
        case '#':
            return Token(TokenType::HASH, "#", startLine, startCol);
        case '?':
            return Token(TokenType::OP_QUESTION, "?", startLine, startCol);
        case ':':
            return Token(TokenType::OP_COLON, ":", startLine, startCol);
        case '~':
            return Token(TokenType::OP_BITWISE_NOT, "~", startLine, startCol);
        case '+':
            return Token(TokenType::OP_PLUS, "+", startLine, startCol);
        case '%':
            return Token(TokenType::OP_MOD, "%", startLine, startCol);
        case '@':
            // @ is used in timing specs like @(posedge clk)
            // For now, treat it as a delimiter
            return Token(TokenType::HASH, "@", startLine, startCol);

        case '=':
            if (match('=')) {
                return Token(TokenType::OP_EQUAL, "==", startLine, startCol);
            }
            return Token(TokenType::OP_ASSIGN, "=", startLine, startCol);

        case '!':
            if (match('=')) {
                return Token(TokenType::OP_NOT_EQUAL, "!=", startLine, startCol);
            }
            return Token(TokenType::OP_NOT, "!", startLine, startCol);

        case '<':
            if (match('<')) {
                return Token(TokenType::OP_LSHIFT, "<<", startLine, startCol);
            }
            if (match('=')) {
                return Token(TokenType::OP_LESS_EQUAL, "<=", startLine, startCol);
            }
            return Token(TokenType::OP_LESS, "<", startLine, startCol);

        case '>':
            if (match('>')) {
                return Token(TokenType::OP_RSHIFT, ">>", startLine, startCol);
            }
            if (match('=')) {
                return Token(TokenType::OP_GREATER_EQUAL, ">=", startLine, startCol);
            }
            return Token(TokenType::OP_GREATER, ">", startLine, startCol);

        case '&':
            if (match('&')) {
                return Token(TokenType::OP_AND, "&&", startLine, startCol);
            }
            return Token(TokenType::OP_BITWISE_AND, "&", startLine, startCol);

        case '|':
            if (match('|')) {
                return Token(TokenType::OP_OR, "||", startLine, startCol);
            }
            return Token(TokenType::OP_BITWISE_OR, "|", startLine, startCol);

        case '^':
            return Token(TokenType::OP_BITWISE_XOR, "^", startLine, startCol);

        case '-':
            return Token(TokenType::OP_MINUS, "-", startLine, startCol);

        case '*':
            return Token(TokenType::OP_MUL, "*", startLine, startCol);

        case '/':
            return Token(TokenType::OP_DIV, "/", startLine, startCol);

        case '\n':
            return Token(TokenType::NEWLINE, "\n", startLine, startCol);

        default:
            return Token(TokenType::UNKNOWN, std::string(1, c), startLine, startCol);
    }
}

TokenType Lexer::getKeywordType(const std::string& text) const {
    if (text == "module") return TokenType::KW_MODULE;
    if (text == "endmodule") return TokenType::KW_ENDMODULE;
    if (text == "input") return TokenType::KW_INPUT;
    if (text == "output") return TokenType::KW_OUTPUT;
    if (text == "inout") return TokenType::KW_INOUT;
    if (text == "wire") return TokenType::KW_WIRE;
    if (text == "reg") return TokenType::KW_REG;
    if (text == "logic") return TokenType::KW_LOGIC;
    if (text == "assign") return TokenType::KW_ASSIGN;
    if (text == "always") return TokenType::KW_ALWAYS;
    if (text == "always_comb") return TokenType::KW_ALWAYS_COMB;
    if (text == "always_ff") return TokenType::KW_ALWAYS_FF;
    if (text == "if") return TokenType::KW_IF;
    if (text == "else") return TokenType::KW_ELSE;
    if (text == "for") return TokenType::KW_FOR;
    if (text == "begin") return TokenType::KW_BEGIN;
    if (text == "end") return TokenType::KW_END;
    if (text == "generate") return TokenType::KW_GENERATE;
    if (text == "endgenerate") return TokenType::KW_ENDGENERATE;
    if (text == "posedge") return TokenType::KW_POSEDGE;
    if (text == "negedge") return TokenType::KW_NEGEDGE;

    return TokenType::IDENTIFIER;
}

}  // namespace schematex
