#include "../include/ast.h"

namespace schematex {

// Port implementation
Port::Port(const std::string& name, Direction dir, int width)
    : name(name), direction(dir), width(width) {
}

std::string Port::toString() const {
    std::string dir_str;
    switch (direction) {
        case Direction::INPUT:
            dir_str = "input";
            break;
        case Direction::OUTPUT:
            dir_str = "output";
            break;
        case Direction::INOUT:
            dir_str = "inout";
            break;
    }
    return dir_str + " " + name + "[" + std::to_string(width) + "]";
}

// Signal implementation
Signal::Signal(const std::string& name, Type type, int width)
    : name(name), type(type), width(width) {
}

std::string Signal::toString() const {
    std::string type_str;
    switch (type) {
        case Type::WIRE:
            type_str = "wire";
            break;
        case Type::REG:
            type_str = "reg";
            break;
        case Type::INTEGER:
            type_str = "integer";
            break;
        case Type::LOGIC:
            type_str = "logic";
            break;
    }
    return type_str + " " + name + "[" + std::to_string(width) + "]";
}

// Instance implementation
Instance::Instance(const std::string& moduleName, const std::string& instanceName)
    : moduleName(moduleName), instanceName(instanceName) {
}

std::string Instance::toString() const {
    return moduleName + " " + instanceName;
}

// Assignment implementation
Assignment::Assignment(const std::string& target, const std::string& source, bool isBlocking)
    : target(target), source(source), isBlocking(isBlocking) {
}

std::string Assignment::toString() const {
    std::string op = isBlocking ? " = " : " <= ";
    return target + op + source;
}

// Block implementation
Block::Block(Type type)
    : type(type) {
}

std::string Block::toString() const {
    std::string type_str = (type == Type::SEQUENTIAL) ? "always @(posedge clk)" : "always @*";
    return type_str;
}

// Module implementation
Module::Module(const std::string& name)
    : name(name) {
}

std::string Module::toString() const {
    return "module " + name;
}

}  // namespace schematex
