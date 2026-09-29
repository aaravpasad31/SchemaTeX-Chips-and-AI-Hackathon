"""Loads the design test suite in tests/designs/ and the `@expect-*` annotations in each file."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

DESIGNS = Path(__file__).resolve().parents[2] / "tests" / "designs"

_ANNOTATION = re.compile(r"//\s*@(expect-[a-z-]+)\s*(.*)$")


@dataclass
class Design:
    path: Path
    type: str | None = None
    instances: int | None = None
    tops: list[str] | None = None
    port_widths: dict[str, int] = field(default_factory=dict)
    diagnostics: list[tuple[str, int, str]] = field(default_factory=list)

    @property
    def id(self) -> str:
        return str(self.path.relative_to(DESIGNS))


def label(ref: dict) -> str:
    """`carry[3]`, `data[7:4]` or `name` for a signal reference from the extractor."""
    bits = ref["bits"]
    if bits is None:
        return ref["name"]
    low, high = bits
    return f"{ref['name']}[{low}]" if low == high else f"{ref['name']}[{high}:{low}]"


def labels(refs: list[dict]) -> list[str]:
    return [label(r) for r in refs]


def load_designs() -> list[Design]:
    return [parse(path) for path in sorted(DESIGNS.rglob("*.sv"))]


def parse(path: Path) -> Design:
    design = Design(path)
    for line in path.read_text().splitlines():
        match = _ANNOTATION.search(line)
        if not match:
            continue
        key, value = match[1], match[2].strip()
        if key == "expect-type":
            design.type = value
        elif key == "expect-instances":
            design.instances = int(value)
        elif key == "expect-tops":
            design.tops = value.split()
        elif key == "expect-port-width":
            target, width = value.split()
            design.port_widths[target] = int(width)
        elif key == "expect-diagnostic":
            severity, rest = value.split(" ", 1)
            line_no, message = rest.split(":", 1)
            design.diagnostics.append((severity, int(line_no), message.strip()))
        elif key in ("expect-net", "expect-no-net"):
            pass  # checked by the web tests
        else:
            raise ValueError(f"{path}: unknown annotation @{key}")
    return design
