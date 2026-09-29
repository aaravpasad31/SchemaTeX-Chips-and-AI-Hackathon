import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import D3Canvas from './D3Canvas'
import type { Tab, Timings } from '../App'
import { classifyModule, MODULE_TYPE_LABELS } from '../lib/classify'
import type { Layout } from '../lib/layout'
import { refLabel } from '../lib/refs'
import type { Diagnostic, ModuleInstance, ParseResponse } from '../types'

interface DiagramProps {
  design: ParseResponse | null
  /** Instances from the top module down to the one being viewed. */
  trail: ModuleInstance[]
  layout: Layout | null
  error: string | null
  loading: boolean
  timings: Timings | null
  /** The editor's code has changed since this diagram was rendered. */
  stale: boolean
  activeTab: Tab
  selectedNet: string | null
  onTabChange: (tab: Tab) => void
  onSelectNet: (net: string | null) => void
  onNavigate: (depth: number) => void
  onSelectTop: (index: number) => void
  onOpenInstance: (index: number) => void
}

const TABS: Tab[] = ['diagram', 'json', 'info']

export default function Diagram({
  design,
  trail,
  layout,
  error,
  loading,
  timings,
  stale,
  activeTab,
  selectedNet,
  onTabChange,
  onSelectNet,
  onNavigate,
  onSelectTop,
  onOpenInstance,
}: DiagramProps) {
  const current = trail[trail.length - 1]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-3/5 flex flex-col bg-slate-50 min-w-0"
    >
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Breadcrumbs design={design} trail={trail} onNavigate={onNavigate} onSelectTop={onSelectTop} />
          {timings && design && (
            <p className="text-xs text-slate-500 mt-0.5">
              Parsed in {Math.round(timings.parse)} ms · laid out in {Math.round(timings.layout)} ms
              {current && ` · ${MODULE_TYPE_LABELS[classifyModule(current)]}`}
              {stale && (
                <span className="ml-2 text-amber-700 font-medium">
                  · Code changed since this render. Click Render to update.
                </span>
              )}
            </p>
          )}
        </div>
        {design && (
          <div className="flex gap-1 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}
      {design && design.diagnostics.length > 0 && <Diagnostics diagnostics={design.diagnostics} />}

      <div className="flex-1 min-h-0 relative">
        {loading && !layout ? (
          <Centered>
            <div className="inline-block w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-3" />
            <p className="text-sm">Elaborating design…</p>
          </Centered>
        ) : !design || !current ? (
          <Centered>
            <p className="text-sm">Enter SystemVerilog code and click "Render" to see the diagram</p>
          </Centered>
        ) : activeTab === 'diagram' ? (
          layout && (
            <>
              <D3Canvas
                layout={layout}
                selectedNet={selectedNet}
                onSelectNet={onSelectNet}
                onOpenInstance={onOpenInstance}
              />
              <Legend selectedNet={selectedNet} canOpen={current.instances.length > 0} />
            </>
          )
        ) : activeTab === 'json' ? (
          <pre className="absolute inset-0 overflow-auto p-6 font-mono text-xs text-slate-700">
            {JSON.stringify(current, null, 2)}
          </pre>
        ) : (
          <div className="absolute inset-0 overflow-auto p-6">
            <ModuleInfo inst={current} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Breadcrumbs({
  design,
  trail,
  onNavigate,
  onSelectTop,
}: Pick<DiagramProps, 'design' | 'trail' | 'onNavigate' | 'onSelectTop'>) {
  if (!design || trail.length === 0) {
    return <h2 className="text-sm font-semibold text-slate-900">Interactive Diagram</h2>
  }
  const tops = design.tops
  return (
    <nav className="flex items-center gap-1 text-sm font-mono flex-wrap">
      {tops.length > 1 ? (
        <select
          value={tops.indexOf(trail[0])}
          onChange={(e) => onSelectTop(Number(e.target.value))}
          className="font-semibold text-slate-900 bg-transparent border border-slate-200 rounded px-1"
        >
          {tops.map((t, i) => (
            <option key={t.path} value={i}>
              {t.module}
            </option>
          ))}
        </select>
      ) : null}
      {trail.map((inst, depth) => {
        if (depth === 0 && tops.length > 1) return null
        const last = depth === trail.length - 1
        return (
          <span key={inst.path} className="flex items-center gap-1">
            {depth > 0 && <span className="text-slate-300">/</span>}
            <button
              disabled={last}
              onClick={() => onNavigate(depth)}
              className={last ? 'font-semibold text-slate-900' : 'text-blue-700 hover:underline'}
              title={inst.path}
            >
              {depth === 0 ? inst.module : `${inst.name}`}
            </button>
            {depth > 0 && last && <span className="text-slate-400 text-xs">({inst.module})</span>}
          </span>
        )
      })}
    </nav>
  )
}

function Diagnostics({ diagnostics }: { diagnostics: Diagnostic[] }) {
  return (
    <ul className="mx-4 mt-3 max-h-32 overflow-auto rounded-lg border border-amber-200 bg-amber-50 text-xs font-mono divide-y divide-amber-100">
      {diagnostics.map((d, i) => (
        <li key={i} className="px-3 py-1.5 flex gap-2">
          <span className={d.severity === 'error' ? 'text-red-700 font-semibold' : 'text-amber-700 font-semibold'}>
            {d.severity}
          </span>
          {d.line !== null && (
            <span className="text-slate-500">
              {d.line}:{d.column}
            </span>
          )}
          <span className="text-slate-800">{d.message}</span>
        </li>
      ))}
    </ul>
  )
}

function Legend({ selectedNet, canOpen }: { selectedNet: string | null; canOpen: boolean }) {
  return (
    <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-md border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] text-slate-600 font-mono">
      <Swatch color="#334155" label="data" />
      <Swatch color="#2563eb" label="clock" />
      <Swatch color="#dc2626" label="reset" />
      <span className="text-slate-300">|</span>
      {selectedNet ? (
        <span>
          net <span className="font-semibold text-slate-900">{selectedNet}</span> · click empty space to clear
        </span>
      ) : (
        <span>Click a wire to trace its net{canOpen && ' · double-click an instance to open it'}</span>
      )}
    </div>
  )
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block w-4 h-0.5" style={{ background: color }} />
      {label}
    </span>
  )
}

function ModuleInfo({ inst }: { inst: ModuleInstance }) {
  const rows: [string, string][] = [
    ['Module', inst.module],
    ['Path', inst.path],
    ['Type', MODULE_TYPE_LABELS[classifyModule(inst)]],
    ['Instances', String(inst.instances.length)],
    ['Logic blocks', String(inst.blocks.length)],
    ['Internal signals', String(inst.signals.length)],
  ]
  return (
    <div className="space-y-6 text-xs font-mono text-slate-700">
      <Table head={['Property', 'Value']} rows={rows} />
      {inst.parameters.length > 0 && (
        <Table head={['Parameter', 'Value']} rows={inst.parameters.map((p) => [p.name, p.value])} />
      )}
      <Table head={['Port', 'Direction', 'Type']} rows={inst.ports.map((p) => [p.name, p.direction, p.type])} />
      {inst.blocks.length > 0 && (
        <Table
          head={['Block', 'Line', 'Reads', 'Writes']}
          rows={inst.blocks.map((b) => [
            b.name ?? b.kind,
            String(b.line),
            b.reads.map(refLabel).join(', '),
            b.writes.map(refLabel).join(', '),
          ])}
        />
      )}
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full border border-slate-200 bg-white">
      <thead className="bg-slate-50 text-slate-500">
        <tr>
          {head.map((h) => (
            <th key={h} className="text-left font-medium px-3 py-1.5 border-b border-slate-200">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-slate-100 last:border-0">
            {row.map((cell, j) => (
              <td key={j} className="px-3 py-1.5 align-top break-all">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-center">{children}</div>
}
