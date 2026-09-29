"""Runs every design in tests/designs/ through the extractor and checks its annotations."""

import json
import re

import pytest

from corpus import Design, labels, load_designs
from schematex import extract

DESIGNS = load_designs()


@pytest.fixture(params=DESIGNS, ids=lambda d: d.id)
def design(request) -> tuple[Design, dict]:
    d: Design = request.param
    return d, extract(d.path.read_text(), filename=d.path.name)


def walk(inst: dict):
    yield inst
    for child in inst["instances"]:
        yield from walk(child)


def test_diagnostics_match_expectations(design) -> None:
    d, result = design
    got = [(x["severity"], x["line"], x["message"]) for x in result["diagnostics"]]
    assert got == [(s, line, msg) for s, line, msg in d.diagnostics]
    assert result["success"] == (not any(s == "error" for s, _, _ in d.diagnostics))


def test_output_is_json_serializable(design) -> None:
    _, result = design
    assert json.loads(json.dumps(result)) == result


def test_tops(design) -> None:
    d, result = design
    tops = [t["module"] for t in result["tops"]]
    if d.tops is not None:
        assert tops == d.tops
    elif not d.diagnostics:
        assert len(tops) == 1, "clean designs have one top unless @expect-tops says otherwise"


def test_instance_count(design) -> None:
    d, result = design
    if d.instances is None:
        return
    assert sum(1 for _ in walk(result["tops"][0])) - 1 == d.instances


def test_port_widths(design) -> None:
    d, result = design
    for target, width in d.port_widths.items():
        inst_name, port = target.rsplit(".", 1)
        inst = next(i for i in result["tops"][0]["instances"] if i["name"] == inst_name)
        assert next(p for p in inst["ports"] if p["name"] == port)["width"] == width, target


def test_every_reference_resolves(design) -> None:
    """Every signal named by a block or connection is a declared port or signal of its scope."""
    d, result = design
    if any(s == "error" for s, _, _ in d.diagnostics):
        return  # an erroneous design can reference things that don't exist
    for top in result["tops"]:
        for inst in walk(top):
            declared = {p["name"] for p in inst["ports"]} | {s["name"] for s in inst["signals"]}

            def resolves(ref: dict) -> bool:
                # Array elements (`link[0][1]`) are declared as the array (`link`).
                if re.sub(r"(\[\d+\])+$", "", ref["name"]) not in declared:
                    return False
                return ref["bits"] is None or ref["bits"][0] <= ref["bits"][1]

            for block in inst["blocks"]:
                for ref in block["reads"] + block["writes"] + block["clocks"]:
                    assert resolves(ref), f"{inst['path']} block {block['id']}: {ref}"
                assert set(labels(block["clocks"])) <= set(labels(block["reads"]))
            for child in inst["instances"]:
                child_ports = {p["name"] for p in child["ports"]}
                for conn in child["connections"]:
                    assert conn["port"] in child_ports
                    for ref in conn["signals"]:
                        assert resolves(ref), f"{child['path']}.{conn['port']}: {ref}"


def test_instance_names_are_unique(design) -> None:
    _, result = design
    for top in result["tops"]:
        for inst in walk(top):
            names = [c["name"] for c in inst["instances"]]
            assert len(names) == len(set(names)), inst["path"]
