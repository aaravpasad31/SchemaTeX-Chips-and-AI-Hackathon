# SchemaTeX web app

React + TypeScript front end that renders elaborated SystemVerilog designs as schematics. It needs the API server in `../server` for parsing (see the [root README](../README.md)).

```bash
npm install
npm run dev     # http://localhost:3000, proxies /api to 127.0.0.1:3001 (override with SCHEMATEX_API)
npm test        # vitest: classification, graph building, ELK layout
npm run build   # type-check and production build
```

Code layout:

- `src/lib/api.ts`: calls `POST /api/parse`
- `src/lib/classify.ts`: the six module types
- `src/lib/graph.ts`: one hierarchy level → nodes, ports and net edges
- `src/lib/layout.ts`: ELK layered layout (loaded lazily)
- `src/components/D3Canvas.tsx`: SVG rendering and interaction
- `src/utils/examples.ts`: loads `../examples/*.sv` into the example picker
