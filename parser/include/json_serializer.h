#ifndef SCHEMATEX_JSON_SERIALIZER_H
#define SCHEMATEX_JSON_SERIALIZER_H

#include "ast.h"
#include <string>
#include <memory>

namespace schematex {

class JSONSerializer {
public:
    // Serialize an AST node to JSON string
    static std::string serialize(const ASTNodePtr& node);

    // Serialize a Module to JSON string
    static std::string serializeModule(const ModulePtr& module);

    // Pretty-print JSON (for debugging)
    static std::string serializePretty(const ASTNodePtr& node, int indent = 0);

private:
    // Helper methods for serializing individual node types
    static std::string serializePort(const PortPtr& port);
    static std::string serializeSignal(const SignalPtr& signal);
    static std::string serializeInstance(const InstancePtr& instance);
    static std::string serializeAssignment(const AssignmentPtr& assignment);
    static std::string serializeBlock(const BlockPtr& block);

    // Utility methods
    static std::string escapeString(const std::string& str);
    static std::string getIndent(int level);
};

}  // namespace schematex

#endif  // SCHEMATEX_JSON_SERIALIZER_H
