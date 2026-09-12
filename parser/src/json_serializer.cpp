#include "../include/json_serializer.h"
#include <sstream>
#include <vector>
#include <iomanip>
#include <cstdio>
#include <memory>

namespace schematex {

std::string JSONSerializer::escapeString(const std::string& str) {
    std::string result;
    for (char c : str) {
        switch (c) {
            case '"':  result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\b': result += "\\b"; break;
            case '\f': result += "\\f"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default:
                if (c < 0x20) {
                    // Control character - escape as \uXXXX
                    char buf[7];
                    snprintf(buf, sizeof(buf), "\\u%04x", (unsigned char)c);
                    result += buf;
                } else {
                    result += c;
                }
        }
    }
    return result;
}

std::string JSONSerializer::getIndent(int level) {
    return std::string(level * 2, ' ');
}

std::string JSONSerializer::serializePort(const PortPtr& port) {
    if (!port) return "{}";

    std::ostringstream oss;
    oss << "{\"name\":\"" << escapeString(port->name) << "\",";

    // Direction
    std::string direction;
    switch (port->direction) {
        case Port::Direction::INPUT:  direction = "input"; break;
        case Port::Direction::OUTPUT: direction = "output"; break;
        case Port::Direction::INOUT:  direction = "inout"; break;
    }
    oss << "\"direction\":\"" << direction << "\",";

    // Width
    oss << "\"width\":" << port->width;

    oss << "}";
    return oss.str();
}

std::string JSONSerializer::serializeSignal(const SignalPtr& signal) {
    if (!signal) return "{}";

    std::ostringstream oss;
    oss << "{\"name\":\"" << escapeString(signal->name) << "\",";

    // Type
    std::string type;
    switch (signal->type) {
        case Signal::Type::WIRE:    type = "wire"; break;
        case Signal::Type::REG:     type = "reg"; break;
        case Signal::Type::LOGIC:   type = "logic"; break;
        case Signal::Type::INTEGER: type = "integer"; break;
    }
    oss << "\"type\":\"" << type << "\",";

    // Width
    oss << "\"width\":" << signal->width;

    oss << "}";
    return oss.str();
}

std::string JSONSerializer::serializeInstance(const InstancePtr& instance) {
    if (!instance) return "{}";

    std::ostringstream oss;
    oss << "{";
    oss << "\"name\":\"" << escapeString(instance->instanceName) << "\",";
    oss << "\"module\":\"" << escapeString(instance->moduleName) << "\",";
    oss << "\"parameters\":{},";
    oss << "\"connections\":{";

    // Add port connections
    bool first = true;
    for (const auto& [port, signal] : instance->portConnections) {
        if (!first) oss << ",";
        oss << "\"" << escapeString(port) << "\":\"" << escapeString(signal) << "\"";
        first = false;
    }

    oss << "}";
    oss << "}";
    return oss.str();
}

std::string JSONSerializer::serializeAssignment(const AssignmentPtr& assignment) {
    if (!assignment) return "{}";

    std::ostringstream oss;
    oss << "{";
    oss << "\"id\":\"assign_" << assignment->target << "\",";
    oss << "\"type\":\"assign\",";
    oss << "\"inputs\":[\"" << escapeString(assignment->source) << "\"],";
    oss << "\"outputs\":[\"" << escapeString(assignment->target) << "\"]";
    oss << "}";
    return oss.str();
}

std::string JSONSerializer::serializeBlock(const BlockPtr& block) {
    if (!block) return "{}";

    std::ostringstream oss;
    oss << "{";

    // Generate block ID and type
    static int blockCounter = 0;
    std::string blockType;
    if (block->type == Block::Type::COMBINATIONAL) {
        blockType = "always_comb";
    } else {
        blockType = "always_ff";
    }

    oss << "\"id\":\"block_" << (blockCounter++) << "\",";
    oss << "\"type\":\"" << blockType << "\",";

    // Extract inputs and outputs from statements
    std::vector<std::string> inputs;
    std::vector<std::string> outputs;

    for (const auto& stmt : block->statements) {
        auto assign = std::dynamic_pointer_cast<Assignment>(stmt);
        if (assign) {
            // Simple heuristic: extract identifiers from source and target
            outputs.push_back(assign->target);
            inputs.push_back(assign->source);
        }
    }

    // Inputs array
    oss << "\"inputs\":[";
    for (size_t i = 0; i < inputs.size(); ++i) {
        if (i > 0) oss << ",";
        oss << "\"" << escapeString(inputs[i]) << "\"";
    }
    oss << "],";

    // Outputs array
    oss << "\"outputs\":[";
    for (size_t i = 0; i < outputs.size(); ++i) {
        if (i > 0) oss << ",";
        oss << "\"" << escapeString(outputs[i]) << "\"";
    }
    oss << "]";

    oss << "}";
    return oss.str();
}

std::string JSONSerializer::serializeModule(const ModulePtr& module) {
    if (!module) {
        return R"({"modules":[],"errors":[]})";
    }

    std::ostringstream oss;
    oss << "{";
    oss << "\"modules\":[";

    // Serialize single module
    oss << "{";
    oss << "\"name\":\"" << escapeString(module->name) << "\",";
    oss << "\"filepath\":\"" << escapeString(module->name) << ".sv\",";

    // Ports array
    oss << "\"ports\":[";
    for (size_t i = 0; i < module->ports.size(); ++i) {
        if (i > 0) oss << ",";
        oss << serializePort(module->ports[i]);
    }
    oss << "],";

    // Signals array
    oss << "\"signals\":[";
    for (size_t i = 0; i < module->signals.size(); ++i) {
        if (i > 0) oss << ",";
        oss << serializeSignal(module->signals[i]);
    }
    oss << "],";

    // Blocks array (from statements that are blocks)
    oss << "\"blocks\":[";
    bool firstBlock = true;
    for (const auto& stmt : module->statements) {
        auto block = std::dynamic_pointer_cast<Block>(stmt);
        if (block) {
            if (!firstBlock) oss << ",";
            oss << serializeBlock(block);
            firstBlock = false;
        }

        auto assign = std::dynamic_pointer_cast<Assignment>(stmt);
        if (assign) {
            if (!firstBlock) oss << ",";
            oss << serializeAssignment(assign);
            firstBlock = false;
        }
    }
    oss << "],";

    // Instances array
    oss << "\"instances\":[";
    for (size_t i = 0; i < module->instances.size(); ++i) {
        if (i > 0) oss << ",";
        oss << serializeInstance(module->instances[i]);
    }
    oss << "],";

    // Parameters array (empty for now as AST doesn't track parameters separately)
    oss << "\"parameters\":[]";

    oss << "}";
    oss << "],";

    // Errors array (empty)
    oss << "\"errors\":[]";

    oss << "}";
    return oss.str();
}

std::string JSONSerializer::serialize(const ASTNodePtr& node) {
    auto module = std::dynamic_pointer_cast<Module>(node);
    if (module) {
        return serializeModule(module);
    }
    return R"({"modules":[],"errors":[]})";
}

std::string JSONSerializer::serializePretty(const ASTNodePtr& node, int indent) {
    // Pretty-print JSON logic - for now, just use compact version
    return serialize(node);
}

}  // namespace schematex
