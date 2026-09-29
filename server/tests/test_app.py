from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_parse_endpoint() -> None:
    response = client.post("/api/parse", json={"code": "module m(input a, output b); assign b = a; endmodule"})
    assert response.status_code == 200
    body = response.json()
    assert body["success"]
    assert body["tops"][0]["blocks"][0] == {
        "id": "b0",
        "kind": "assign",
        "name": None,
        "line": 1,
        "reads": [{"name": "a", "bits": None}],
        "writes": [{"name": "b", "bits": None}],
        "clocks": [],
    }


def test_rejects_oversized_source() -> None:
    response = client.post("/api/parse", json={"code": "x" * 1_000_001})
    assert response.status_code == 413
