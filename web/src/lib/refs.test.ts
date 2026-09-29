import { describe, expect, it } from 'vitest'
import { overlap, refLabel, splitRef } from './refs'

const sel = (name: string, bits: [number, number] | null = null) => splitRef({ name, bits }).selection

describe('refLabel', () => {
  it('formats whole signals, single bits and ranges', () => {
    expect(refLabel({ name: 'count', bits: null })).toBe('count')
    expect(refLabel({ name: 'carry', bits: [3, 3] })).toBe('carry[3]')
    expect(refLabel({ name: 'data', bits: [4, 7] })).toBe('data[7:4]')
    expect(refLabel({ name: 'taps[2]', bits: [0, 3] })).toBe('taps[2][3:0]')
  })
})

describe('splitRef', () => {
  it('separates array elements but keeps generate scopes in the signal name', () => {
    expect(splitRef({ name: 'link[0][1]', bits: null })).toEqual({
      signal: 'link',
      selection: { element: '[0][1]', bits: null },
    })
    expect(splitRef({ name: 'g[0].x', bits: [1, 1] }).signal).toBe('g[0].x')
  })
})

describe('overlap', () => {
  it('connects bits that overlap and nothing else', () => {
    expect(overlap(sel('carry', [1, 1]), sel('carry', [1, 1]))).toEqual(sel('carry', [1, 1]))
    expect(overlap(sel('carry', [1, 1]), sel('carry', [2, 2]))).toBeUndefined()
    expect(overlap(sel('data', [0, 7]), sel('data', [4, 11]))).toEqual(sel('data', [4, 7]))
  })

  it('treats a whole signal as covering every bit', () => {
    expect(overlap(sel('cnt1'), sel('cnt1', [3, 3]))).toEqual(sel('cnt1', [3, 3]))
  })

  it('treats a whole array as covering every element', () => {
    expect(overlap(sel('row_in'), sel('row_in[0]'))).toEqual(sel('row_in[0]'))
    expect(overlap(sel('link[0]'), sel('link[0][1]'))).toEqual(sel('link[0][1]'))
    expect(overlap(sel('link[0]'), sel('link[1][1]'))).toBeUndefined()
    expect(overlap(sel('taps[1]'), sel('taps[10]'))).toBeUndefined()
  })
})
