#ifndef SCHEMATEX_AST_H
#define SCHEMATEX_AST_H

#include <string>
#include <vector>
#include <memory>
#include <variant>

namespace schematex {

// Forward declarations
class ASTNode;
class Module;
class Port;
class Signal;
class Instance;
class Assignment;
class Block;
class Expression;

using ASTNodePtr = std::shared_ptr<ASTNode>;
using ModulePtr = std::shared_ptr<Module>;
using PortPtr = std::shared_ptr<Port>;
using SignalPtr = std::shared_ptr<Signal>;
using InstancePtr = std::shared_ptr<Instance>;
using AssignmentPtr = std::shared_ptr<Assignment>;
using BlockPtr = std::shared_ptr<Block>;
using ExpressionPtr = std::shared_ptr<Expression>;

// Base class for all AST nodes
class ASTNode {
public:
    virtual ~ASTNode() = default;
    virtual std::string toString() const = 0;
};

// Port definition (input, output, inout)
class Port : public ASTNode {
public:
    enum class Direction { INPUT, OUTPUT, INOUT };

    Port(const std::string& name, Direction dir, int width = 1);

    std::string toString() const override;

    std::string name;
    Direction direction;
    int width;  // Bit width (1 for single bit, e.g., 8 for [7:0])
};

// Signal declaration (wire, reg)
class Signal : public ASTNode {
public:
    enum class Type { WIRE, REG, INTEGER, LOGIC };

    Signal(const std::string& name, Type type, int width = 1);

    std::string toString() const override;

    std::string name;
    Type type;
    int width;
};

// Instance of a module
class Instance : public ASTNode {
public:
    Instance(const std::string& moduleName, const std::string& instanceName);

    std::string toString() const override;

    std::string moduleName;
    std::string instanceName;
    std::vector<std::pair<std::string, std::string>> portConnections;  // port -> signal mapping
};

// Assignment statement
class Assignment : public ASTNode {
public:
    Assignment(const std::string& target, const std::string& source, bool isBlocking = true);

    std::string toString() const override;

    std::string target;
    std::string source;
    bool isBlocking;  // true for =, false for <=
};

// Block (begin...end or always block)
class Block : public ASTNode {
public:
    enum class Type { SEQUENTIAL, COMBINATIONAL };

    Block(Type type = Type::COMBINATIONAL);

    std::string toString() const override;

    Type type;
    std::vector<ASTNodePtr> statements;
};

// Module definition
class Module : public ASTNode {
public:
    explicit Module(const std::string& name);

    std::string toString() const override;

    std::string name;
    std::vector<PortPtr> ports;
    std::vector<SignalPtr> signals;
    std::vector<InstancePtr> instances;
    std::vector<ASTNodePtr> statements;  // assignments, blocks, etc.
};

}  // namespace schematex

#endif  // SCHEMATEX_AST_H
