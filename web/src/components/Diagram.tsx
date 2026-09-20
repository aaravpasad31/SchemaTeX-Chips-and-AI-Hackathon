import { motion } from 'framer-motion'
import D3Canvas from './D3Canvas'

interface DiagramProps {
  result: any
  error: string | null
  loading: boolean
  stats: any
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function Diagram({
  result,
  error,
  loading,
  stats,
  activeTab,
  onTabChange,
}: DiagramProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-3/5 flex flex-col bg-slate-50"
    >
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h2 className="text-sm font-semibold text-slate-900">Interactive Diagram</h2>
        {result && (
          <p className="text-xs text-slate-500 mt-1">
            ✓ Rendered · {stats?.total}ms
          </p>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            <span className="font-semibold">Error:</span> {error}
          </p>
        </div>
      )}

      {result && (
        <div className="border-b border-slate-200 bg-white px-6 py-2 flex gap-1">
          {['diagram', 'json', 'info'].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'text-slate-900 bg-slate-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-3" />
              <p className="text-sm">Processing pipeline...</p>
            </div>
          </div>
        ) : result ? (
          activeTab === 'diagram' ? (
            <D3Canvas graph={result.layoutedGraphs?.[0]} />
          ) : activeTab === 'json' ? (
            <div className="bg-white rounded-lg border border-slate-200 p-4 font-mono text-xs text-slate-700 overflow-auto max-h-full">
              <pre>{JSON.stringify(result.parseResult, null, 2)}</pre>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
              <div className="font-semibold mb-3">Pipeline Information</div>
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500">Parse Time:</span>{' '}
                  {stats?.parseTime}ms
                </div>
                <div>
                  <span className="text-slate-500">Total Time:</span> {stats?.total}ms
                </div>
                <div>
                  <span className="text-slate-500">Modules:</span>{' '}
                  {result.parseResult?.modules?.length || 0}
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-center">
            <p className="text-sm">
              👈 Enter SystemVerilog code and click "Render"
              <br />
              to see the interactive diagram
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
