"""HTTP API: POST SystemVerilog source to /api/parse, get the elaborated design back."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from schematex import extract

MAX_SOURCE_BYTES = 1_000_000

app = FastAPI(title="SchemaTeX")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


class ParseRequest(BaseModel):
    code: str


@app.post("/api/parse")
def parse(request: ParseRequest) -> dict:
    if len(request.code.encode()) > MAX_SOURCE_BYTES:
        raise HTTPException(status_code=413, detail="Source is larger than 1 MB")
    return extract(request.code)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}
