// Mirrors the JSON returned by the server's POST /api/parse (server/schematex/extract.py).

export type Direction = 'input' | 'output' | 'inout'

export type BlockKind =
  | 'always_ff'
  | 'always_comb'
  | 'always_latch'
  | 'always'
  | 'initial'
  | 'final'
  | 'assign'

export interface Diagnostic {
  severity: 'error' | 'warning' | 'note'
  message: string
  line: number | null
  column: number | null
}

export interface Port {
  name: string
  direction: Direction
  width: number
  type: string
}

export interface Signal {
  name: string
  kind: 'net' | 'variable'
  /** For unpacked arrays, the width of one element. */
  width: number
  type: string
  isEnum: boolean
  isArray: boolean
}

/**
 * A reference to a signal in the owning instance. `name` is a signal, or one element of an
 * unpacked array (`taps[2]`). `bits` is the constant [low, high] bit range selected, or null
 * for the whole signal (including selects with a non-constant index).
 */
export interface SignalRef {
  name: string
  bits: [number, number] | null
}

export interface LogicBlock {
  id: string
  kind: BlockKind
  name: string | null
  line: number
  reads: SignalRef[]
  writes: SignalRef[]
  /** Event signals used as clocks (async resets are excluded). */
  clocks: SignalRef[]
}

export interface Connection {
  port: string
  direction: Direction
  /** Signals in the parent referenced by the port expression. */
  signals: SignalRef[]
  expr: string | null
}

export interface ModuleInstance {
  name: string
  module: string
  path: string
  parameters: { name: string; value: string }[]
  ports: Port[]
  signals: Signal[]
  blocks: LogicBlock[]
  instances: ModuleInstance[]
  /** Present on every instance except top-level modules. */
  connections?: Connection[]
}

export interface ParseResponse {
  success: boolean
  diagnostics: Diagnostic[]
  tops: ModuleInstance[]
}

export interface Example {
  name: string
  /** Heading the example is listed under in the picker. */
  group: string
  code: string
}
