"""Command-line entry point: `python -m schematex design.sv` prints the design JSON."""

import json
import sys
from pathlib import Path

from .extract import extract


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python -m schematex <file.sv>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    result = extract(path.read_text(), filename=path.name)
    json.dump(result, sys.stdout, indent=2)
    print()
    return 0 if result["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
