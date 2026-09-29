import { motion } from 'framer-motion'
import type { Example } from '../types'

interface EditorProps {
  code: string
  selectedExample: string
  examples: Record<string, Example>
  loading: boolean
  onCodeChange: (code: string) => void
  onExampleChange: (key: string) => void
  onRender: () => void
  onClear: () => void
}

export default function Editor({
  code,
  selectedExample,
  examples,
  loading,
  onCodeChange,
  onExampleChange,
  onRender,
  onClear,
}: EditorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-2/5 flex flex-col border-r border-slate-200 bg-white"
    >
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">SystemVerilog Input</h2>
        <select
          value={selectedExample}
          onChange={(e) => onExampleChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
        >
          {groupExamples(examples).map(([group, entries]) => (
            <optgroup key={group} label={group}>
              {entries.map(([key, example]) => (
                <option key={key} value={key}>
                  {example.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <textarea
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onRender()
          }
        }}
        spellCheck={false}
        placeholder="Paste SystemVerilog code here..."
        className="flex-1 px-6 py-4 font-mono text-xs bg-white text-slate-900 border-0 resize-none focus:outline-none placeholder-slate-400"
        style={{ lineHeight: '1.6' }}
      />

      <div className="px-6 py-4 border-t border-slate-200 flex gap-3 flex-wrap">
        <button
          onClick={onRender}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Rendering...
            </span>
          ) : (
            '▶ Render'
          )}
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2.5 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 active:scale-95 transition-all"
        >
          Clear
        </button>
      </div>
    </motion.div>
  )
}

/** Examples grouped by heading, in the order the groups first appear. */
function groupExamples(examples: Record<string, Example>) {
  const groups = new Map<string, [string, Example][]>()
  for (const entry of Object.entries(examples)) {
    const group = entry[1].group
    groups.set(group, [...(groups.get(group) ?? []), entry])
  }
  return [...groups]
}
