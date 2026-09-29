// Runs every design in tests/designs/ through graph building and ELK layout, at every level
// of the hierarchy, and checks the `@expect-type` / `@expect-net` annotations (see
// tests/designs/README.md). The designs are elaborated by the real Python extractor, so
// server/.venv must exist (`make setup`).
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import type { ModuleInstance, ParseResponse } from '../types'
import { classifyModule } from './classify'
import { buildSchematic, type Schematic } from './graph'
import { layoutSchematic } from './layout'

const ROOT = resolve(__dirname, '../../..')
const DESIGNS = join(ROOT, 'tests/designs')
const PYTHON = join(ROOT, 'server/.venv/bin/python')

/** Per-level layout time budget; generous for CI, but catches pathological layouts (seconds). */
const LAYOUT_BUDGET_MS = 1500

interface Expectations {
  type?: string
  nets: [string, string][]
  noNets: [string, string][]
}

const files = readdirSync(DESIGNS, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.sv'))
  .sort()

function expectations(source: string): Expectations {
  const result: Expectations = { nets: [], noNets: [] }
  for (const [, key, value] of source.matchAll(/\/\/\s*@(expect-[a-z-]+)[ \t]*(.*)$/gm)) {
    const arrow = () => value.split('->').map((s) => s.trim()) as [string, string]
    if (key === 'expect-type') result.type = value.trim()
    else if (key === 'expect-net') result.nets.push(arrow())
    else if (key === 'expect-no-net') result.noNets.push(arrow())
  }
  return result
}

/** Elaborate all designs in one Python process. */
function elaborateAll(): Record<string, ParseResponse> {
  if (!existsSync(PYTHON)) throw new Error('server/.venv is missing: run `make setup` first')
  const script = `
import json, sys
from pathlib import Path
from schematex import extract
out = {p: extract(Path(p).read_text(), filename=Path(p).name) for p in sys.argv[1:]}
json.dump(out, sys.stdout)
`
  const paths = files.map((f) => join(DESIGNS, f))
  const stdout = execFileSync(PYTHON, ['-c', script, ...paths], {
    cwd: join(ROOT, 'server'),
    maxBuffer: 256 * 1024 * 1024,
  })
  const byPath: Record<string, ParseResponse> = JSON.parse(stdout.toString())
  return Object.fromEntries(Object.entries(byPath).map(([p, r]) => [relative(DESIGNS, p), r]))
}

/**
 * Wires in a schematic as `from -> to`. Endpoints are module ports (`clk`), instance pins
 * (`u_fa.cin`) and logic-block pins named by block kind and line (`assign@24.carry[0]`).
 */
function wireNames(inst: ModuleInstance, schematic: Schematic): Set<string> {
  const endpoint = (portId: string) => {
    const [kind, a, ...rest] = portId.split(':')
    if (kind === 'port') return a
    if (kind === 'inst') return `${inst.instances[Number(a)].name}.${rest.join(':')}`
    // blk:<id>:in|out:<pin>, where the pin label may itself contain ':' (`data[7:4]`)
    const block = inst.blocks.find((b) => b.id === a)!
    return `${block.kind}@${block.line}.${rest.slice(1).join(':')}`
  }
  return new Set(schematic.edges.map((e) => `${endpoint(e.source)} -> ${endpoint(e.target)}`))
}

function* levels(inst: ModuleInstance): Generator<ModuleInstance> {
  yield inst
  for (const child of inst.instances) yield* levels(child)
}

let results: Record<string, ParseResponse>

beforeAll(() => {
  results = elaborateAll()
}, 60_000)

describe.each(files)('%s', (file) => {
  const expected = expectations(readFileSync(join(DESIGNS, file), 'utf8'))

  it('lays out every level of the hierarchy', async () => {
    for (const top of results[file].tops) {
      // Instances of the same module with the same parameters look identical; lay each out once.
      const seen = new Set<string>()
      for (const inst of levels(top)) {
        const key = JSON.stringify([inst.module, inst.parameters, inst.ports])
        if (seen.has(key)) continue
        seen.add(key)

        const started = performance.now()
        const layout = await layoutSchematic(buildSchematic(inst))
        const elapsed = performance.now() - started
        expect(elapsed, `${inst.path}: layout took ${Math.round(elapsed)} ms`).toBeLessThan(LAYOUT_BUDGET_MS)
        for (const edge of layout.edges) {
          expect(edge.points.length, `${inst.path}: ${edge.net} not routed`).toBeGreaterThanOrEqual(2)
        }
        for (const [i, a] of layout.nodes.entries()) {
          expect(Number.isFinite(a.x) && Number.isFinite(a.y), `${inst.path}: ${a.id} not placed`).toBe(true)
          for (const b of layout.nodes.slice(i + 1)) {
            const overlap =
              a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
            expect(overlap, `${inst.path}: ${a.id} overlaps ${b.id}`).toBe(false)
          }
        }
      }
    }
  })

  if (expected.type) {
    it(`classifies the top module as ${expected.type}`, () => {
      expect(classifyModule(results[file].tops[0])).toBe(expected.type)
    })
  }

  if (expected.nets.length || expected.noNets.length) {
    it('wires the top level as expected', () => {
      const top = results[file].tops[0]
      const wires = wireNames(top, buildSchematic(top))
      for (const [from, to] of expected.nets) expect(wires, 'missing wire').toContain(`${from} -> ${to}`)
      for (const [from, to] of expected.noNets) expect(wires, 'unexpected wire').not.toContain(`${from} -> ${to}`)
    })
  }
})
