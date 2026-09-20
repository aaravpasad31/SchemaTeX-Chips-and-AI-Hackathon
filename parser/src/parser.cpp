#include "../include/parser.h"
#include <sstream>

namespace schematex {

Parser::Parser(const std::vector<Token>& tokens)
    : tokens_(tokens), current_(0) {
}

Parser::Parser(const std::string& input)
    : current_(0) {
    Lexer lexer(input);
    tokens_ = lexer.tokenize();
}

ModulePtr Parser::parse() {
    if (isAtEnd()) {
        error("Empty input");
        return nullptr;
    }

    ModulePtr module = parseModule();

    if (!module) {
        error("Failed to parse module");
        return nullptr;
    }

    return module;
}

ModulePtr Parser::parseModule() {
    if (!check(TokenType::KW_MODULE)) {
        error("Expected 'module' keyword");
        return nullptr;
    }

    Token moduleToken = advance();  // consume 'module'

    // Get module name
    if (!check(TokenType::IDENTIFIER)) {
        error("Expected module name after 'module' keyword");
        return nullptr;
    }

    Token nameToken = advance();
    std::string moduleName = nameToken.value;

    auto module = std::make_shared<Module>(moduleName);

    // Parse port list
    if (!check(TokenType::LPAREN)) {
        error("Expected '(' after module name");
        return nullptr;
    }

    advance();  // consume '('

    // Parse port list
    if (!check(TokenType::RPAREN)) {
        do {
            PortPtr port = parsePort();
            if (port) {
                module->ports.push_back(port);
            }
        } while (match(TokenType::COMMA) && !isAtEnd());
    }

    if (!match(TokenType::RPAREN)) {
        error("Expected ')' after port list");
        return nullptr;
    }

    if (!match(TokenType::SEMICOLON)) {
        error("Expected ';' after module declaration");
        return nullptr;
    }

    // Parse module body
    while (!isAtEnd() && !check(TokenType::KW_ENDMODULE)) {
        // Try parsing signal declarations
        if (check(TokenType::KW_WIRE) || check(TokenType::KW_REG) || check(TokenType::KW_LOGIC)) {
            SignalPtr signal = parseSignal();
            if (signal) {
                module->signals.push_back(signal);
            }
            continue;
        }

        // Try parsing assignments
        if (check(TokenType::KW_ASSIGN)) {
            advance();  // consume 'assign'
            AssignmentPtr assignment = parseAssignment();
            if (assignment) {
                module->statements.push_back(assignment);
            }
            if (match(TokenType::SEMICOLON)) {
                // good
            } else {
                error("Expected ';' after assignment");
            }
            continue;
        }

        // Try parsing always blocks
        if (check(TokenType::KW_ALWAYS) || check(TokenType::KW_ALWAYS_COMB) || check(TokenType::KW_ALWAYS_FF)) {
            BlockPtr block = parseBlock();
            if (block) {
                module->statements.push_back(block);
            }
            continue;
        }

        // Try parsing module instances
        if (check(TokenType::IDENTIFIER)) {
            // Look ahead to see if this is a module instantiation
            if (peekAhead(1).type == TokenType::IDENTIFIER) {
                InstancePtr instance = parseInstance();
                if (instance) {
                    module->instances.push_back(instance);
                }
                continue;
            }
        }

        // Skip unknown tokens to avoid infinite loop
        advance();
    }

    // Consume 'endmodule'
    if (!match(TokenType::KW_ENDMODULE)) {
        error("Expected 'endmodule' keyword");
        return nullptr;
    }

    return module;
}

PortPtr Parser::parsePort() {
    // Parse port direction
    Port::Direction direction = Port::Direction::INPUT;

    if (match(TokenType::KW_INPUT)) {
        direction = Port::Direction::INPUT;
    } else if (match(TokenType::KW_OUTPUT)) {
        direction = Port::Direction::OUTPUT;
    } else if (match(TokenType::KW_INOUT)) {
        direction = Port::Direction::INOUT;
    } else {
        error("Expected port direction (input, output, inout)");
        return nullptr;
    }

    // Skip optional type keyword (wire, logic, etc.)
    if (check(TokenType::KW_WIRE) || check(TokenType::KW_LOGIC) || check(TokenType::KW_REG)) {
        advance();
    }

    // Parse bit width if present
    int width = 1;
    if (match(TokenType::LBRACKET)) {
        if (check(TokenType::NUMBER)) {
            Token msb = advance();
            width = std::stoi(msb.value) + 1;  // [3:0] has width 4

            // Check for range [MSB:LSB]
            if (match(TokenType::OP_COLON)) {
                if (check(TokenType::NUMBER)) {
                    Token lsb = advance();
                    // width is already set correctly
                }
            }
        }
        if (!match(TokenType::RBRACKET)) {
            error("Expected ']' after bit width");
        }
    }

    // Get port name
    if (!check(TokenType::IDENTIFIER)) {
        error("Expected port name");
        return nullptr;
    }

    Token nameToken = advance();
    std::string portName = nameToken.value;

    return std::make_shared<Port>(portName, direction, width);
}

SignalPtr Parser::parseSignal() {
    Signal::Type type = Signal::Type::WIRE;

    if (match(TokenType::KW_WIRE)) {
        type = Signal::Type::WIRE;
    } else if (match(TokenType::KW_REG)) {
        type = Signal::Type::REG;
    } else if (match(TokenType::KW_LOGIC)) {
        type = Signal::Type::LOGIC;
    } else {
        error("Expected signal type (wire, reg, logic)");
        return nullptr;
    }

    // Parse bit width if present
    int width = 1;
    if (match(TokenType::LBRACKET)) {
        if (check(TokenType::NUMBER)) {
            Token msb = advance();
            width = std::stoi(msb.value) + 1;

            if (match(TokenType::OP_COLON)) {
                if (check(TokenType::NUMBER)) {
                    Token lsb = advance();
                }
            }
        }
        if (!match(TokenType::RBRACKET)) {
            error("Expected ']' after bit width");
        }
    }

    // Get signal name
    if (!check(TokenType::IDENTIFIER)) {
        error("Expected signal name");
        return nullptr;
    }

    Token nameToken = advance();
    std::string signalName = nameToken.value;

    if (!match(TokenType::SEMICOLON)) {
        error("Expected ';' after signal declaration");
    }

    return std::make_shared<Signal>(signalName, type, width);
}

BlockPtr Parser::parseBlock() {
    Block::Type blockType = Block::Type::COMBINATIONAL;

    if (match(TokenType::KW_ALWAYS_FF)) {
        blockType = Block::Type::SEQUENTIAL;
        // Parse timing specification like @(posedge clk)
        if (match(TokenType::HASH)) {
            // Handle parameter like #CLK_PERIOD
            if (check(TokenType::IDENTIFIER)) {
                advance();
            }
        }
        // Parse @(...) timing spec - @ is lexed as HASH
        if (check(TokenType::HASH) && peek().value == "@") {
            advance();  // consume @
            if (match(TokenType::LPAREN)) {
                // Skip timing specification content
                int depth = 1;
                while (!isAtEnd() && depth > 0) {
                    if (check(TokenType::LPAREN)) depth++;
                    else if (check(TokenType::RPAREN)) depth--;
                    advance();
                }
            }
        }
    } else if (match(TokenType::KW_ALWAYS_COMB)) {
        blockType = Block::Type::COMBINATIONAL;
    } else if (match(TokenType::KW_ALWAYS)) {
        // Determine based on the timing spec
        if (check(TokenType::HASH)) {
            // Could be a parameter or @ symbol
            Token current = peek();
            if (current.value == "#") {
                blockType = Block::Type::SEQUENTIAL;
                advance();
                // Skip parameter
                if (check(TokenType::IDENTIFIER)) {
                    advance();
                }
            } else if (current.value == "@") {
                blockType = Block::Type::SEQUENTIAL;
                advance();  // consume @
                if (match(TokenType::LPAREN)) {
                    int depth = 1;
                    while (!isAtEnd() && depth > 0) {
                        if (check(TokenType::LPAREN)) depth++;
                        else if (check(TokenType::RPAREN)) depth--;
                        advance();
                    }
                }
            }
        } else if (check(TokenType::LPAREN)) {
            advance();  // consume (
            int depth = 1;
            while (!isAtEnd() && depth > 0) {
                if (check(TokenType::LPAREN)) depth++;
                else if (check(TokenType::RPAREN)) depth--;
                advance();
            }
        }
    } else {
        error("Expected 'always', 'always_comb', or 'always_ff'");
        return nullptr;
    }

    auto block = std::make_shared<Block>(blockType);

    // Parse block body
    if (match(TokenType::KW_BEGIN)) {
        // Parse statements until 'end'
        while (!isAtEnd() && !check(TokenType::KW_END)) {
            ASTNodePtr stmt = parseStatement();
            if (stmt) {
                block->statements.push_back(stmt);
            }
        }
        if (!match(TokenType::KW_END)) {
            error("Expected 'end' after block");
        }
    } else {
        // Single statement block (rare but possible)
        ASTNodePtr stmt = parseStatement();
        if (stmt) {
            block->statements.push_back(stmt);
        }
    }

    return block;
}

AssignmentPtr Parser::parseAssignment() {
    // This is called after 'assign' has been consumed
    // Parse: target = expression;

    if (!check(TokenType::IDENTIFIER)) {
        error("Expected assignment target");
        return nullptr;
    }

    Token target = advance();
    std::string targetName = target.value;

    // Handle bit selection like [3:0]
    if (match(TokenType::LBRACKET)) {
        // Skip bit range for now
        while (!isAtEnd() && !check(TokenType::RBRACKET)) {
            advance();
        }
        if (match(TokenType::RBRACKET)) {
            // good
        }
    }

    if (!match(TokenType::OP_ASSIGN)) {
        error("Expected '=' in assignment");
        return nullptr;
    }

    // Parse the expression (for now, just consume tokens until semicolon)
    std::string expression;
    int depth = 0;
    while (!isAtEnd() && !(check(TokenType::SEMICOLON) && depth == 0)) {
        Token t = peek();
        if (!expression.empty()) expression += " ";
        expression += t.value;
        advance();

        if (check(TokenType::LPAREN) || check(TokenType::LBRACKET)) depth++;
        if (check(TokenType::RPAREN) || check(TokenType::RBRACKET)) depth--;
    }

    return std::make_shared<Assignment>(targetName, expression, true);
}

InstancePtr Parser::parseInstance() {
    // moduleName instanceName(...);
    if (!check(TokenType::IDENTIFIER)) {
        error("Expected module name");
        return nullptr;
    }

    Token moduleToken = advance();
    std::string moduleName = moduleToken.value;

    if (!check(TokenType::IDENTIFIER)) {
        error("Expected instance name");
        return nullptr;
    }

    Token instanceToken = advance();
    std::string instanceName = instanceToken.value;

    auto instance = std::make_shared<Instance>(moduleName, instanceName);

    // Parse port connections (with fix for infinite loop on malformed input)
    if (match(TokenType::LPAREN)) {
        while (!check(TokenType::RPAREN) && !isAtEnd()) {
            size_t startPos = current_;

            // Parse port connection: .portName(signalName)
            if (match(TokenType::DOT)) {
                if (check(TokenType::IDENTIFIER)) {
                    Token portName = advance();
                    if (match(TokenType::LPAREN)) {
                        if (check(TokenType::IDENTIFIER)) {
                            Token signalName = advance();
                            instance->portConnections.push_back({portName.value, signalName.value});
                        }
                        match(TokenType::RPAREN);
                    }
                }
            }

            if (!check(TokenType::RPAREN)) {
                match(TokenType::COMMA);
            }

            // BUGFIX: If no progress was made in this iteration, advance once to prevent infinite loop
            // This can occur if the input is malformed (e.g., missing DOT or COMMA between port connections)
            if (current_ == startPos && !check(TokenType::RPAREN)) {
                advance();
            }
        }
        match(TokenType::RPAREN);
    }

    if (!match(TokenType::SEMICOLON)) {
        error("Expected ';' after instance");
    }

    return instance;
}

ASTNodePtr Parser::parseStatement() {
    if (check(TokenType::KW_IF)) {
        // For now, skip if statements - just consume until else/end
        advance();  // consume 'if'
        if (match(TokenType::LPAREN)) {
            int depth = 1;
            while (!isAtEnd() && depth > 0) {
                if (check(TokenType::LPAREN)) depth++;
                else if (check(TokenType::RPAREN)) depth--;
                advance();
            }
        }

        if (match(TokenType::KW_BEGIN)) {
            int depth = 1;
            while (!isAtEnd() && depth > 0) {
                if (check(TokenType::KW_BEGIN)) depth++;
                else if (check(TokenType::KW_END)) depth--;
                if (depth > 0) advance();
                else break;
            }
            match(TokenType::KW_END);
        } else {
            // Single statement
            while (!isAtEnd() && !check(TokenType::SEMICOLON) && !check(TokenType::KW_ELSE)) {
                advance();
            }
        }

        // Handle else clause
        if (check(TokenType::KW_ELSE)) {
            advance();
            if (match(TokenType::KW_BEGIN)) {
                int depth = 1;
                while (!isAtEnd() && depth > 0) {
                    if (check(TokenType::KW_BEGIN)) depth++;
                    else if (check(TokenType::KW_END)) depth--;
                    if (depth > 0) advance();
                    else break;
                }
                match(TokenType::KW_END);
            } else {
                while (!isAtEnd() && !check(TokenType::SEMICOLON)) {
                    advance();
                }
            }
        }

        match(TokenType::SEMICOLON);
        return nullptr;  // Return null for if statements for now
    }

    // Try parsing as assignment
    if (check(TokenType::IDENTIFIER)) {
        Token target = advance();

        // Handle bit selection
        if (match(TokenType::LBRACKET)) {
            while (!isAtEnd() && !check(TokenType::RBRACKET)) {
                advance();
            }
            match(TokenType::RBRACKET);
        }

        // Check for assignment operator
        bool isBlocking = false;
        if (match(TokenType::OP_ASSIGN)) {
            isBlocking = true;
        } else if (match(TokenType::OP_LESS_EQUAL)) {
            isBlocking = false;
        } else {
            error("Expected '=' or '<=' in statement");
            return nullptr;
        }

        // Parse the RHS expression
        std::string expression;
        int depth = 0;
        while (!isAtEnd() && !(check(TokenType::SEMICOLON) && depth == 0)) {
            Token t = peek();
            if (!expression.empty()) expression += " ";
            expression += t.value;
            advance();

            if (check(TokenType::LPAREN) || check(TokenType::LBRACKET)) depth++;
            if (check(TokenType::RPAREN) || check(TokenType::RBRACKET)) depth--;
        }

        match(TokenType::SEMICOLON);

        return std::make_shared<Assignment>(target.value, expression, isBlocking);
    }

    // Skip unknown statements
    if (!isAtEnd()) {
        advance();
    }

    return nullptr;
}

Token Parser::peek() const {
    if (isAtEnd()) {
        return Token(TokenType::EOF_TOKEN, "", 0, 0);
    }
    return tokens_[current_];
}

Token Parser::peekAhead(int offset) const {
    if (current_ + offset >= tokens_.size()) {
        return Token(TokenType::EOF_TOKEN, "", 0, 0);
    }
    return tokens_[current_ + offset];
}

Token Parser::advance() {
    if (!isAtEnd()) {
        current_++;
    }
    return tokens_[current_ - 1];
}

bool Parser::match(TokenType type) {
    if (check(type)) {
        advance();
        return true;
    }
    return false;
}

bool Parser::match(const std::vector<TokenType>& types) {
    for (TokenType type : types) {
        if (check(type)) {
            advance();
            return true;
        }
    }
    return false;
}

Token Parser::consume(TokenType type, const std::string& message) {
    if (check(type)) {
        return advance();
    }
    error(message);
    return Token(TokenType::UNKNOWN, "", 0, 0);
}

bool Parser::isAtEnd() const {
    return current_ >= tokens_.size() || peek().type == TokenType::EOF_TOKEN;
}

bool Parser::check(TokenType type) const {
    if (isAtEnd()) {
        return false;
    }
    return peek().type == type;
}

void Parser::error(const std::string& message) {
    std::ostringstream oss;
    Token t = peek();
    oss << "Line " << t.line << ", Column " << t.column << ": " << message;
    errors_.push_back(oss.str());
}

void Parser::synchronize() {
    advance();

    while (!isAtEnd()) {
        if (peek().type == TokenType::SEMICOLON) {
            advance();
            return;
        }
        advance();
    }
}

}  // namespace schematex
