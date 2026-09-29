import { describe, expect, it } from 'vitest'
import type { ModuleInstance, ParseResponse } from '../types'
import { classifyModule } from './classify'
import { buildSchematic } from './graph'
import { layoutSchematic } from './layout'
// Server output for files in examples/, regenerated with `python -m schematex`.
import counter from './__fixtures__/counter_4bit.json'
import processor from './__fixtures__/processor.json'
import shiftRegister from './__fixtures__/shift_register.json'
import trafficLight from './__fixtures__/traffic_light.json'

const top = (fixture: unknown) => (fixture as ParseResponse).tops[0]

const connections = (inst: ModuleInstance) => {
  const s = buildSchematic(inst)
  return s.edges.map((e) => `${e.source} -> ${e.target} (${e.net})`).sort()
}

describe('classifyModule', () => {
  it('classifies each example module', () => {
    const proc = top(processor)
    expect(classifyModule(proc)).toBe('mixed')
    expect(proc.instances.map(classifyModule)).toEqual(['combinational', 'memory', 'combinational'])
    expect(classifyModule(top(counter))).toBe('sequential')
    expect(classifyModule(top(trafficLight))).toBe('fsm')
    expect(classifyModule(top(shiftRegister))).toBe('mixed')
  })
})

describe('buildSchematic', () => {
  it('wires module ports and logic blocks into nets', () => {
    expect(connections(top(counter))).toEqual([
      'blk:b0:out:count_next -> blk:b1:in:count_next (count_next)',
      'blk:b1:out:count -> blk:b0:in:count (count)',
      'blk:b1:out:count -> port:count:p (count)',
      'port:clk:p -> blk:b1:in:clk (clk)',
      'port:enable:p -> blk:b0:in:enable (enable)',
      'port:reset:p -> blk:b0:in:reset (reset)',
    ])
  })

  it('connects instances through their port bindings', () => {
    const edges = connections(top(processor))
    expect(edges).toContain('inst:0:result -> inst:1:data_in (alu_out)')
    expect(edges).toContain('inst:1:data_out -> inst:2:mem_data (mem_data)')
    expect(edges).toContain('inst:2:data_out -> port:data_out:p (data_out)')
    expect(edges).toContain('blk:b0:out:alu_in_a -> inst:0:a (alu_in_a)')
  })

  it('chains generated instances through individual array elements', () => {
    const edges = connections(top(shiftRegister))
    expect(edges).toContain('blk:b0:out:taps[0] -> inst:0:d (taps)')
    expect(edges).toContain('inst:0:q -> inst:1:d (taps)')
    expect(edges).toContain('inst:3:q -> blk:b1:in:taps[4] (taps)')
    expect(edges).not.toContain('inst:0:q -> inst:2:d (taps)')
  })

  it('marks clock nets and clock pins', () => {
    const s = buildSchematic(top(counter))
    expect(s.edges.find((e) => e.net === 'clk')?.signalClass).toBe('clock')
    expect(s.edges.find((e) => e.net === 'reset')?.signalClass).toBe('reset')
    const ff = s.nodes.find((n) => n.id === 'blk:b1')!
    expect(ff.ports.find((p) => p.name === 'clk')?.clock).toBe(true)
  })

  it('labels each net once', () => {
    const s = buildSchematic(top(counter))
    const count = s.edges.filter((e) => e.net === 'count')
    expect(count.map((e) => e.label)).toEqual(['count [4]', null])
  })
})

describe('layoutSchematic', () => {
  it.each([
    ['counter_4bit', counter],
    ['processor', processor],
    ['shift_register', shiftRegister],
    ['traffic_light', trafficLight],
  ])('places %s without overlaps and routes every edge', async (_, fixture) => {
    const layout = await layoutSchematic(buildSchematic(top(fixture)))

    for (const edge of layout.edges) expect(edge.points.length).toBeGreaterThanOrEqual(2)

    for (const [i, a] of layout.nodes.entries()) {
      for (const b of layout.nodes.slice(i + 1)) {
        const overlap =
          a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false)
      }
    }

    // Module inputs sit left of everything else, outputs right of everything else.
    const inputs = layout.nodes.filter((n) => n.kind === 'boundary' && n.direction === 'input')
    const outputs = layout.nodes.filter((n) => n.kind === 'boundary' && n.direction === 'output')
    const inner = layout.nodes.filter((n) => n.kind !== 'boundary')
    for (const n of inner) {
      for (const i of inputs) expect(i.x + i.width).toBeLessThanOrEqual(n.x)
      for (const o of outputs) expect(o.x).toBeGreaterThanOrEqual(n.x + n.width)
    }
  })

  it('attaches edges to the fixed port positions', async () => {
    const layout = await layoutSchematic(buildSchematic(top(processor)))
    const absolute = new Map(
      layout.nodes.flatMap((n) => n.ports.map((p) => [p.id, { x: n.x + p.x, y: n.y + p.y }] as const)),
    )
    for (const edge of layout.edges) {
      const start = edge.points[0]
      const end = edge.points[edge.points.length - 1]
      expect(start.x).toBeCloseTo(absolute.get(edge.source)!.x, 0)
      expect(start.y).toBeCloseTo(absolute.get(edge.source)!.y, 0)
      expect(end.x).toBeCloseTo(absolute.get(edge.target)!.x, 0)
      expect(end.y).toBeCloseTo(absolute.get(edge.target)!.y, 0)
    }
  })
})
