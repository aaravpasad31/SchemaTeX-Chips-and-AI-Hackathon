#ifndef SCHEMATEX_PARSER_H
#define SCHEMATEX_PARSER_H

#include "token.h"
#include "ast.h"
#include "lexer.h"
#include <vector>
#include <memory>

namespace schematex {

class Parser {
public:
    explicit Parser(const std::vector<Token>& tokens);
    explicit Parser(const std::string& input);

    // Parse the input and return the root AST node
    ModulePtr parse();

    // Get error messages if parsing failed
    const std::vector<std::string>& getErrors() const { return errors_; }

    bool hasErrors() const { return !errors_.empty(); }

private:
    std::vector<Token> tokens_;
    size_t current_;
    std::vector<std::string> errors_;

    // Helper methods
    Token peek() const;
    Token peekAhead(int offset) const;
    Token advance();
    bool match(TokenType type);
    bool match(const std::vector<TokenType>& types);
    Token consume(TokenType type, const std::string& message);
    bool isAtEnd() const;
    bool check(TokenType type) const;

    // Parsing methods
    ModulePtr parseModule();
    PortPtr parsePort();
    std::vector<SignalPtr> parseSignal();
    InstancePtr parseInstance();
    AssignmentPtr parseAssignment();
    BlockPtr parseBlock();
    ASTNodePtr parseStatement();

    // Error handling
    void error(const std::string& message);
    void synchronize();
};

}  // namespace schematex

#endif  // SCHEMATEX_PARSER_H
