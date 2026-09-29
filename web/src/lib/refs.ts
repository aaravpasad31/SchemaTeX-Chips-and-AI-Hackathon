import type { SignalRef } from '../types'
import { baseName } from './classify'

export type Bits = [number, number] | null

/**
 * The part of a signal a reference touches: an unpacked-array element path (`''` for the
 * whole signal, `'[2]'`, `'[0][1]'`) and a bit range within it (`null` for all bits).
 */
export interface Selection {
  element: string
  bits: Bits
}

/** `carry[3]`, `data[7:4]`, or just the name when the whole signal is referenced. */
export function refLabel(ref: SignalRef): string {
  if (!ref.bits) return ref.name
  const [low, high] = ref.bits
  return low === high ? `${ref.name}[${low}]` : `${ref.name}[${high}:${low}]`
}

/** Split `link[0][1]` into the declared signal `link` and the selection `[0][1]`. */
export function splitRef(ref: SignalRef): { signal: string; selection: Selection } {
  const signal = baseName(ref.name)
  return { signal, selection: { element: ref.name.slice(signal.length), bits: ref.bits } }
}

/**
 * The bits two references to the same signal both touch: `null` means the whole signal,
 * `undefined` means they don't overlap.
 */
export function intersect(a: Bits, b: Bits): Bits | undefined {
  if (!a) return b
  if (!b) return a
  const low = Math.max(a[0], b[0])
  const high = Math.min(a[1], b[1])
  return low <= high ? [low, high] : undefined
}

/**
 * What two selections of the same signal have in common, or `undefined` if nothing.
 * A whole array covers each of its elements; within one element, bit ranges must overlap.
 */
export function overlap(a: Selection, b: Selection): Selection | undefined {
  if (a.element === b.element) {
    const bits = intersect(a.bits, b.bits)
    return bits === undefined ? undefined : { element: a.element, bits }
  }
  const [outer, inner] = a.element.length < b.element.length ? [a, b] : [b, a]
  return inner.element.startsWith(outer.element) ? inner : undefined
}
