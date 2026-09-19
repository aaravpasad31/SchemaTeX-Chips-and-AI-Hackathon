@echo off
REM Mock parser for E2E testing
REM Outputs sample JSON AST for counter_4bit.sv

setlocal enabledelayedexpansion

REM Read the file path from arguments
set "filePath=%1"

REM Output sample JSON AST
echo {
echo   "modules": [
echo     {
echo       "name": "counter_4bit",
echo       "filepath": "counter_4bit.sv",
echo       "ports": [
echo         {"name": "clk", "direction": "input", "width": 1, "line": 4},
echo         {"name": "reset", "direction": "input", "width": 1, "line": 5},
echo         {"name": "enable", "direction": "input", "width": 1, "line": 6},
echo         {"name": "count", "direction": "output", "width": 4, "line": 7}
echo       ],
echo       "signals": [
echo         {"name": "count_next", "width": 4, "type": "logic", "line": 10}
echo       ],
echo       "blocks": [
echo         {"id": "block_0", "type": "always_comb", "inputs": ["count"], "outputs": ["count_next"], "line": 13},
echo         {"id": "block_1", "type": "always_ff", "inputs": ["count_next"], "outputs": ["count"], "clk": "clk", "reset": "reset", "line": 25}
echo       ],
echo       "instances": [],
echo       "parameters": []
echo     }
echo   ],
echo   "errors": []
echo }
