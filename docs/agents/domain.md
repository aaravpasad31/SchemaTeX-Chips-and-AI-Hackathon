# Domain Docs: Single-Context Layout

This project uses a single-context layout:

- **CONTEXT.md** at the repo root: the authoritative description of the project's domain, purpose, and key concepts
- **docs/adr/**: architectural decision records (ADRs) documenting why key design choices were made

## Writing CONTEXT.md

CONTEXT.md should cover:
- What this project does and why it exists
- Key domain terms and concepts
- Architecture overview
- How to build, test, and deploy

Keep it up-to-date as the project evolves. Skills like `triage`, `to-spec`, and `code-review` read this to understand context.

## Writing ADRs

One ADR per significant architectural decision. Name them `NNNN-short-title.md` (e.g., `0001-use-postgres.md`).

Each ADR should include:
- **Status**: Proposed / Accepted / Superseded
- **Context**: the issue or problem this addresses
- **Decision**: what we chose to do
- **Consequences**: trade-offs and impact
