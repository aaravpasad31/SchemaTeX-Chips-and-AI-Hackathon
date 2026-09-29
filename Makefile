PY := server/.venv/bin/python
EXAMPLES := counter_4bit processor shift_register traffic_light

.PHONY: setup dev test fixtures

setup:
	python3 -m venv server/.venv
	server/.venv/bin/pip install -r server/requirements-dev.txt
	cd web && npm install

# Runs the API server and the web dev server together; Ctrl-C stops both.
dev:
	@trap 'kill 0' EXIT; \
	(cd server && .venv/bin/uvicorn app:app --port 3001 --reload) & \
	(cd web && npm run dev)

test:
	cd server && .venv/bin/pytest -q
	cd web && npm test

# Regenerate the server output the web tests run against.
fixtures:
	for f in $(EXAMPLES); do \
		(cd server && .venv/bin/python -m schematex ../examples/$$f.sv) > web/src/lib/__fixtures__/$$f.json; \
	done
