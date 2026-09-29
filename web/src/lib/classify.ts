import type { ModuleInstance } from '../types'

export type ModuleType =
  | 'hierarchical'
  | 'mixed'
  | 'fsm'
  | 'memory'
  | 'sequential'
  | 'combinational'

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  hierarchical: 'Hierarchical',
  mixed: 'Mixed',
  fsm: 'State machine',
  memory: 'Memory',
  sequential: 'Sequential',
  combinational: 'Combinational',
}

/** Classify a module into one of the six block types described in CONTEXT.md. */
export function classifyModule(inst: ModuleInstance): ModuleType {
  const hasInstances = inst.instances.length > 0
  const hasLogic = inst.blocks.length > 0
  if (hasInstances) return hasLogic ? 'mixed' : 'hierarchical'

  const registered = new Set(
    inst.blocks.filter((b) => b.kind === 'always_ff').flatMap((b) => b.writes.map((w) => baseName(w.name))),
  )
  if (registered.size === 0) return 'combinational'

  const regSignals = inst.signals.filter((s) => registered.has(s.name))
  if (regSignals.some((s) => s.isEnum)) return 'fsm'
  if (regSignals.some((s) => s.isArray)) return 'memory'
  return 'sequential'
}

/**
 * `taps[3]` → `taps`, `link[0][1]` → `link`: array elements are separate nets but declared once.
 * Only trailing indices are stripped, so generate-scoped names like `stage[0].x` survive.
 */
export function baseName(signal: string): string {
  return signal.replace(/(\[[^[\]]*\])+$/, '')
}
