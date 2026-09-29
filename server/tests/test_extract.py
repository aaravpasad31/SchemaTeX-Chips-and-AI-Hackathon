from pathlib import Path

import pytest

from corpus import labels
from schematex import extract

EXAMPLES = Path(__file__).resolve().parents[2] / "examples"


def load(name: str) -> dict:
    return extract((EXAMPLES / name).read_text(), filename=name)


def block(instance: dict, kind: str) -> dict:
    return next(b for b in instance["blocks"] if b["kind"] == kind)


@pytest.mark.parametrize("path", sorted(EXAMPLES.glob("*.sv")), ids=lambda p: p.name)
def test_examples_elaborate_cleanly(path: Path) -> None:
    result = extract(path.read_text(), filename=path.name)
    assert result["diagnostics"] == []
    assert result["success"]
    assert len(result["tops"]) == 1


def test_ports_and_widths() -> None:
    (top,) = load("counter_4bit.sv")["tops"]
    assert top["module"] == "counter_4bit"
    assert [(p["name"], p["direction"], p["width"]) for p in top["ports"]] == [
        ("clk", "input", 1),
        ("reset", "input", 1),
        ("enable", "input", 1),
        ("count", "output", 4),
    ]
    assert [s["name"] for s in top["signals"]] == ["count_next"]


def test_block_reads_writes_and_clocks() -> None:
    (top,) = load("counter_4bit.sv")["tops"]
    comb = block(top, "always_comb")
    assert labels(comb["reads"]) == ["reset", "enable", "count"]
    assert labels(comb["writes"]) == ["count_next"]
    assert labels(comb["clocks"]) == []

    ff = block(top, "always_ff")
    assert labels(ff["writes"]) == ["count"]
    assert labels(ff["clocks"]) == ["clk"]


def test_async_reset_is_not_a_clock() -> None:
    (top,) = load("counter_chain.sv")["tops"]
    ff = block(top["instances"][0], "always_ff")
    assert labels(ff["clocks"]) == ["clk"]
    assert "reset" in labels(ff["reads"])


def test_hierarchy_and_connections() -> None:
    (top,) = load("processor.sv")["tops"]
    assert [(i["name"], i["module"]) for i in top["instances"]] == [
        ("alu_inst", "alu"),
        ("mem_ctrl_inst", "memory_controller"),
        ("cache_controller_inst", "cache_controller"),
    ]
    mem = top["instances"][1]
    conns = {c["port"]: (c["direction"], labels(c["signals"])) for c in mem["connections"]}
    assert conns["addr"] == ("input", ["mem_addr"])
    assert conns["data_out"] == ("output", ["mem_data"])
    # Children are fully elaborated too.
    assert labels(block(mem, "always_ff")["clocks"]) == ["clk"]


def test_bit_select_connection_keeps_its_range() -> None:
    (top,) = load("counter_chain.sv")["tops"]
    c2 = top["instances"][1]
    clk = next(c for c in c2["connections"] if c["port"] == "clk")
    assert clk["signals"] == [{"name": "cnt1", "bits": [3, 3]}]
    assert clk["expr"] == "cnt1[3]"


def test_part_selects_resolve_to_bit_ranges() -> None:
    result = extract(
        "module m(input logic [15:0] a, output logic [7:0] y, output logic [3:0] z, output logic w);\n"
        "  assign y = a[15:8];\n"
        "  assign z = a[4 +: 4];\n"
        "  assign w = a[7 -: 1];\n"
        "endmodule\n"
    )
    reads = [b["reads"] for b in result["tops"][0]["blocks"]]
    assert reads == [
        [{"name": "a", "bits": [8, 15]}],
        [{"name": "a", "bits": [4, 7]}],
        [{"name": "a", "bits": [7, 7]}],
    ]


def test_dynamic_select_uses_whole_signal() -> None:
    result = extract("module m(input logic [7:0] a, input logic [2:0] i, output logic y); assign y = a[i]; endmodule")
    assert labels(result["tops"][0]["blocks"][0]["reads"]) == ["a", "i"]


def test_generate_loop_flattens_and_splits_array_elements() -> None:
    (top,) = load("shift_register.sv")["tops"]
    assert top["parameters"] == [{"name": "DEPTH", "value": "4"}, {"name": "WIDTH", "value": "8"}]
    assert [i["name"] for i in top["instances"]] == [f"stage[{n}].ff" for n in range(4)]
    for n, inst in enumerate(top["instances"]):
        conns = {c["port"]: labels(c["signals"]) for c in inst["connections"]}
        assert conns["d"] == [f"taps[{n}]"]
        assert conns["q"] == [f"taps[{n + 1}]"]
        assert inst["parameters"] == [{"name": "WIDTH", "value": "8"}]
        assert next(p for p in inst["ports"] if p["name"] == "d")["width"] == 8
    assert labels(top["blocks"][0]["writes"]) == ["taps[0]"]
    assert labels(top["blocks"][1]["reads"]) == ["taps[4]"]


def test_enum_and_array_signals_are_flagged() -> None:
    (fsm,) = load("traffic_light.sv")["tops"]
    signals = {s["name"]: s for s in fsm["signals"]}
    assert signals["state"]["isEnum"]
    assert not signals["timer"]["isEnum"]

    (proc,) = load("processor.sv")["tops"]
    mem = {s["name"]: s for s in proc["instances"][1]["signals"]}
    assert mem["mem"]["isArray"]
    assert mem["mem"]["width"] == 32


def test_dynamic_index_write_targets_whole_array() -> None:
    (proc,) = load("processor.sv")["tops"]
    ff = block(proc["instances"][1], "always_ff")
    assert "mem" in labels(ff["writes"])
    assert "addr[7:0]" in labels(ff["reads"])


def test_errors_are_reported_with_locations() -> None:
    result = extract("module m(input a, output b);\n  assign b = a & c;\nendmodule\n")
    assert not result["success"]
    (diag,) = result["diagnostics"]
    assert diag == {
        "severity": "error",
        "message": "use of undeclared identifier 'c'",
        "line": 2,
        "column": 18,
    }
    # The design is still returned so the diagram can show what did parse.
    assert result["tops"][0]["module"] == "m"


def test_syntax_error_does_not_raise() -> None:
    result = extract("module broken(input a\n")
    assert not result["success"]
    assert result["diagnostics"]
