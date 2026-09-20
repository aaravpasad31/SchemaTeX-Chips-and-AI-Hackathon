cmake_minimum_required(VERSION 3.10)
project(SchemaTeX-Parser)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Main parser executable
add_executable(schematex-parser
    src/main.cpp
    src/lexer.cpp
    src/parser.cpp
    src/ast.cpp
    src/json_serializer.cpp
)

target_include_directories(schematex-parser PRIVATE include)

# Tests
enable_testing()
add_executable(parser-tests
    tests/lexer_test.cpp
    tests/parser_test.cpp
    src/lexer.cpp
    src/parser.cpp
    src/ast.cpp
    src/json_serializer.cpp
)
target_include_directories(parser-tests PRIVATE include)
add_test(NAME ParserTests COMMAND parser-tests)

# JSON Serialization tests
add_executable(json-tests
    tests/json_test.cpp
    src/lexer.cpp
    src/parser.cpp
    src/ast.cpp
    src/json_serializer.cpp
)
target_include_directories(json-tests PRIVATE include)
add_test(NAME JSONTests COMMAND json-tests)
