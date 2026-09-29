"""Elaborate SystemVerilog with slang and extract the design hierarchy as JSON.

The output is a tree of module instances rooted at each top-level module.
Every instance lists its ports, internal signals, logic blocks (with the
signals each block reads and writes) and child instances (with the signals
bound to each of their ports). All signal names are relative to the
instance that owns them, so the web app can build a diagram for any level
of the hierarchy without further lookups.

Signal references are `{"name": ..., "bits": [low, high] | null}`: a constant
bit or part select keeps its range, so the web app can connect a driver and a
reader only when the bits they touch overlap.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from typing import Any, NamedTuple

import pyslang
from pyslang import analysis, ast, syntax

SK = ast.SymbolKind
EK = ast.ExpressionKind

_DIRECTIONS = {
    ast.ArgumentDirection.In: "input",
    ast.ArgumentDirection.Out: "output",
    ast.ArgumentDirection.InOut: "inout",
    ast.ArgumentDirection.Ref: "inout",
}

_BLOCK_KINDS = {
    ast.ProceduralBlockKind.AlwaysFF: "always_ff",
    ast.ProceduralBlockKind.AlwaysComb: "always_comb",
    ast.ProceduralBlockKind.AlwaysLatch: "always_latch",
    ast.ProceduralBlockKind.Always: "always",
    ast.ProceduralBlockKind.Initial: "initial",
    ast.ProceduralBlockKind.Final: "final",
}

_SEVERITIES = {
    pyslang.DiagnosticSeverity.Ignored: "note",
    pyslang.DiagnosticSeverity.Note: "note",
    pyslang.DiagnosticSeverity.Warning: "warning",
    pyslang.DiagnosticSeverity.Error: "error",
    pyslang.DiagnosticSeverity.Fatal: "error",
}

_SIGNAL_KINDS = (SK.Variable, SK.Net)


def extract(code: str, filename: str = "input.sv") -> dict[str, Any]:
    """Parse and elaborate `code`, returning diagnostics and the instance tree."""
    tree = syntax.SyntaxTree.fromText(code, name=filename)
    compilation = ast.Compilation()
    compilation.addSyntaxTree(tree)

    # Elaborate first: diagnostics are only complete once the tree is visited.
    sm = tree.sourceManager
    tops = [_instance(inst, sm, prefix=inst.hierarchicalPath) for inst in compilation.getRoot().topInstances]
    diags = list(compilation.getAllDiagnostics())

    # Driver checks (e.g. a variable assigned both continuously and procedurally) live in
    # slang's separate analysis pass, which, like the slang CLI, only runs on a clean compile.
    if not any(d.isError() for d in diags):
        compilation.freeze()
        manager = analysis.AnalysisManager()
        manager.analyze(compilation)
        diags += manager.getDiagnostics()
        compilation.unfreeze()

    diagnostics = _diagnostics(diags, sm)

    return {
        "success": not any(d["severity"] == "error" for d in diagnostics),
        "diagnostics": diagnostics,
        "tops": tops,
    }


def _diagnostics(diags: list[pyslang.Diagnostic], sm: pyslang.SourceManager) -> list[dict[str, Any]]:
    engine = pyslang.DiagnosticEngine(sm)
    result = []
    for diag in diags:
        loc = diag.location
        valid = loc.buffer.id != 0
        result.append(
            {
                "severity": _SEVERITIES[engine.getSeverity(diag.code, loc)],
                "message": engine.formatMessage(diag),
                "line": sm.getLineNumber(loc) if valid else None,
                "column": sm.getColumnNumber(loc) if valid else None,
            }
        )
    return sorted(result, key=lambda d: (d["line"] or 0, d["column"] or 0))


def _instance(inst: ast.InstanceSymbol, sm: pyslang.SourceManager, prefix: str) -> dict[str, Any]:
    body = inst.body
    base = body.hierarchicalPath

    ports = [
        {"name": p.name, "direction": _DIRECTIONS[p.direction], "width": _width(p.type), "type": str(p.type)}
        for p in body.portList
        if p.kind == SK.Port
    ]
    port_names = {p["name"] for p in ports}

    signals: list[dict[str, Any]] = []
    blocks: list[dict[str, Any]] = []
    instances: list[dict[str, Any]] = []

    for member in _members(body):
        if member.kind in _SIGNAL_KINDS:
            name = _relative(member, base)
            if name in port_names:
                continue
            signals.append(
                {
                    "name": name,
                    "kind": "net" if member.kind == SK.Net else "variable",
                    "width": _width(member.type),
                    "type": str(member.type),
                    "isEnum": member.type.canonicalType.isEnum,
                    "isArray": member.type.isUnpackedArray,
                }
            )
        elif member.kind == SK.ProceduralBlock:
            kind = _BLOCK_KINDS[member.procedureKind]
            blocks.append(_block(member, kind, base, sm, index=len(blocks)))
        elif member.kind == SK.ContinuousAssign:
            blocks.append(_block(member, "assign", base, sm, index=len(blocks)))
        elif member.kind == SK.Instance:
            child = _instance(member, sm, prefix=base)
            child["connections"] = _connections(member, base)
            instances.append(child)

    return {
        "name": _relative(inst, prefix) if prefix != inst.hierarchicalPath else inst.name,
        "module": body.definition.name,
        "path": inst.hierarchicalPath,
        "parameters": _parameters(body),
        "ports": ports,
        "signals": signals,
        "blocks": blocks,
        "instances": instances,
    }


def _members(scope: Any):
    """Yield the members of a module body, flattening generate blocks and instance arrays."""
    for member in scope:
        if member.kind == SK.GenerateBlock:
            if not member.isUninstantiated:
                yield from _members(member)
        elif member.kind == SK.GenerateBlockArray:
            # Each loop iteration is a GenerateBlock; the array also holds the genvar itself.
            yield from _members(m for m in member if m.kind == SK.GenerateBlock)
        elif member.kind == SK.InstanceArray:
            yield from _members(member.elements)
        else:
            yield member


def _parameters(body: Any) -> list[dict[str, str]]:
    params = []
    for member in body:
        if member.kind == SK.Parameter and not member.isLocalParam:
            params.append({"name": member.name, "value": str(member.value)})
    return params


def _block(symbol: Any, kind: str, base: str, sm: pyslang.SourceManager, index: int) -> dict[str, Any]:
    refs = _Refs(base)
    targets = _Refs(base)
    events = _Refs(base)
    writes: dict[Ref, None] = {}  # ordered set

    def visit(node: Any) -> None:
        refs.visit(node)
        if isinstance(node, ast.AssignmentExpression):
            for ref in _lvalue_refs(node.left, base):
                writes[ref] = None
                # A compound assignment (`x += 1`) also reads its target.
                if not node.isCompound:
                    targets.add(ref)
        elif isinstance(node, ast.SignalEventControl):
            node.expr.visit(events.visit)

    symbol.visit(visit)

    # A signal is read if it appears anywhere other than as an assignment target.
    reads = _simplify(ref for ref, count in refs.counts.items() if count > targets.counts.get(ref, 0))
    # Event signals that the body never tests are clocks; `if (reset)` marks an async reset.
    clocks = [ref for ref in events.refs() if refs.counts[ref] == events.counts[ref]]
    writes = _simplify(writes)

    return {
        "id": f"b{index}",
        "kind": kind,
        "name": symbol.name or None,
        "line": sm.getLineNumber(symbol.location),
        "reads": [_ref_json(r) for r in reads],
        "writes": [_ref_json(r) for r in writes],
        "clocks": [_ref_json(r) for r in clocks] if kind in ("always_ff", "always", "always_latch") else [],
    }


class Ref(NamedTuple):
    """A reference to a local signal, optionally narrowed to a constant bit range.

    `name` is the signal, or one element of an unpacked array (`taps[2]`), since each
    element is effectively its own variable. `bits` is the (low, high) index range
    within it, in the signal's declared numbering, or None for the whole thing.
    """

    name: str
    bits: tuple[int, int] | None = None


def _ref_json(ref: Ref) -> dict[str, Any]:
    return {"name": ref.name, "bits": list(ref.bits) if ref.bits else None}


class _Refs:
    """Counts references to local signals across visited expression nodes.

    Constant selects are counted as references to exactly what they select (`carry[3]`,
    `data[7:4]`, `taps[2]`), so generate loops that wire up individual bits or array
    elements produce distinct nets rather than one net joining everything.
    """

    def __init__(self, base: str) -> None:
        self.base = base
        self.counts: dict[Ref, int] = {}

    def add(self, ref: Ref, n: int = 1) -> None:
        self.counts[ref] = self.counts.get(ref, 0) + n

    def visit(self, node: Any) -> None:
        if isinstance(node, ast.NamedValueExpression):
            ref = _resolve(node, self.base)
            if ref is not None:
                self.add(ref)
        elif isinstance(node, (ast.ElementSelectExpression, ast.RangeSelectExpression)):
            ref = _resolve(node, self.base)
            if ref is not None:
                # The visitor goes on to count what this selects from; cancel that out.
                self.add(ref)
                self.add(_resolve(node.value, self.base), -1)

    def refs(self) -> list[Ref]:
        return _simplify(ref for ref, count in self.counts.items() if count > 0)


def _simplify(refs: Iterable[Ref]) -> list[Ref]:
    """Drop bit ranges of signals that are also referenced whole; they add nothing."""
    refs = list(dict.fromkeys(refs))
    whole = {r.name for r in refs if r.bits is None}
    return [r for r in refs if r.bits is None or r.name not in whole]


def _resolve(expr: Any, base: str) -> Ref | None:
    """The reference an expression denotes, if it is a local signal or a constant select of one."""
    if isinstance(expr, ast.NamedValueExpression):
        name = _local_name(expr.symbol, base)
        return Ref(name) if name is not None else None

    if not isinstance(expr, (ast.ElementSelectExpression, ast.RangeSelectExpression)):
        return None
    inner = _resolve(expr.value, base)
    if inner is None or inner.bits is not None:
        return None  # selects of selects (e.g. bits of a bit range) fall back to the whole signal

    if isinstance(expr, ast.ElementSelectExpression):
        index = _const_int(expr.selector.constant)
        if index is None:
            return None
        if expr.value.type.isUnpackedArray:
            return Ref(f"{inner.name}[{index}]")
        bits = (index, index)
    else:
        bits = _range_bits(expr)
        if bits is None:
            return None

    # Only treat it as a bit range when it really selects bits of a flat vector; one element
    # of a multi-dimensional packed array would otherwise be mistaken for a single bit.
    if expr.type.bitWidth != bits[1] - bits[0] + 1:
        return None
    return Ref(inner.name, bits)


def _range_bits(expr: Any) -> tuple[int, int] | None:
    left = _const_int(expr.left.constant)
    right = _const_int(expr.right.constant)
    if left is None or right is None:
        return None
    kind = expr.selectionKind
    if kind == ast.RangeSelectionKind.IndexedUp:  # [base +: width]
        return (left, left + right - 1)
    if kind == ast.RangeSelectionKind.IndexedDown:  # [base -: width]
        return (left - right + 1, left)
    return (min(left, right), max(left, right))


_SIZED_LITERAL = re.compile(r"^\d*'s?([bodh])([0-9a-fA-F_]+)$")
_RADIX = {"b": 2, "o": 8, "d": 10, "h": 16}


def _const_int(value: Any) -> int | None:
    """Integer value of a slang constant, or None if it isn't a known integer."""
    if value is None:
        return None
    text = str(value)
    try:
        return int(text)
    except ValueError:
        pass
    match = _SIZED_LITERAL.match(text)
    if match:
        return int(match[2].replace("_", ""), _RADIX[match[1]])
    return None  # contains x/z bits, or isn't an integer


def _signal_refs(expr: Any, base: str) -> list[Ref]:
    refs = _Refs(base)
    expr.visit(refs.visit)
    return refs.refs()


def _lvalue_refs(expr: Any, base: str) -> list[Ref]:
    """What an lvalue ultimately assigns, looking through selects and concatenations."""
    ref = _resolve(expr, base)
    if ref is not None:
        return [ref]
    if isinstance(expr, (ast.ElementSelectExpression, ast.RangeSelectExpression)) or expr.kind == EK.MemberAccess:
        return _lvalue_refs(expr.value, base)
    if expr.kind == EK.Concatenation:
        return [r for operand in expr.operands for r in _lvalue_refs(operand, base)]
    if expr.kind == EK.Conversion:
        return _lvalue_refs(expr.operand, base)
    return []


def _connections(inst: ast.InstanceSymbol, base: str) -> list[dict[str, Any]]:
    connections = []
    for conn in inst.portConnections:
        port = conn.port
        if port.kind != SK.Port:
            continue
        expr = conn.expression
        signals: list[Ref] = []
        text = None
        if expr is not None:
            # Output ports are bound as an assignment whose left side is the external signal.
            target = expr.left if expr.kind == EK.Assignment else expr
            signals = _signal_refs(target, base)
            if target.syntax is not None:
                text = str(target.syntax).strip()
        connections.append(
            {
                "port": port.name,
                "direction": _DIRECTIONS[port.direction],
                "signals": [_ref_json(r) for r in signals],
                "expr": text,
            }
        )
    return connections


def _local_name(symbol: Any, base: str) -> str | None:
    """Name of a signal relative to the module at `base`, or None if it isn't a local signal."""
    if symbol.kind not in _SIGNAL_KINDS:
        return None
    path = symbol.hierarchicalPath
    if not path.startswith(base + "."):
        return None
    # Variables declared in procedural code (loop counters, function locals) aren't module
    # signals, even though their hierarchical path can look like one (`top.i`).
    parent = symbol.parentScope
    if parent is not None and parent.isProceduralContext:
        return None
    return path[len(base) + 1 :]


def _relative(symbol: Any, base: str) -> str:
    path = symbol.hierarchicalPath
    return path[len(base) + 1 :] if path.startswith(base + ".") else symbol.name


def _width(type_: Any) -> int:
    """Bit width of a signal; for unpacked arrays, the width of one element."""
    while type_.isUnpackedArray:
        type_ = type_.arrayElementType
    return int(type_.bitWidth)
