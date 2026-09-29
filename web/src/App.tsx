import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Editor from './components/Editor'
import Diagram from './components/Diagram'
import { DEFAULT_EXAMPLE, examples } from './utils/examples'
import { parseDesign } from './lib/api'
import { buildSchematic } from './lib/graph'
import { layoutSchematic, type Layout } from './lib/layout'
import type { ModuleInstance, ParseResponse } from './types'

export type Tab = 'diagram' | 'json' | 'info'

export interface Timings {
  parse: number
  layout: number
}

export default function App() {
  const [code, setCode] = useState(examples[DEFAULT_EXAMPLE]?.code ?? '')
  const [selectedExample, setSelectedExample] = useState(DEFAULT_EXAMPLE)
  const [design, setDesign] = useState<ParseResponse | null>(null)
  /** Index of the top module, then instance indices down the hierarchy. */
  const [path, setPath] = useState<number[]>([0])
  const [layout, setLayout] = useState<Layout | null>(null)
  const [selectedNet, setSelectedNet] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('diagram')
  const [timings, setTimings] = useState<Timings | null>(null)
  /** The source the current diagram was rendered from, to flag when the editor has moved on. */
  const [renderedCode, setRenderedCode] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)

  const trail = useMemo(() => resolvePath(design, path), [design, path])
  const current = trail[trail.length - 1] ?? null

  const render = useCallback(async (source: string) => {
    if (!source.trim()) {
      setError('Please enter some SystemVerilog code')
      return
    }
    request.current?.abort()
    const controller = (request.current = new AbortController())

    setLoading(true)
    setError(null)
    const started = performance.now()
    try {
      const result = await parseDesign(source, controller.signal)
      setDesign(result)
      setRenderedCode(source)
      setPath([0])
      setSelectedNet(null)
      setTimings({ parse: performance.now() - started, layout: 0 })
      if (result.tops.length === 0 && result.success) setError('No modules found')
    } catch (err) {
      if (controller.signal.aborted) return
      setDesign(null)
      setLayout(null)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (request.current === controller) setLoading(false)
    }
  }, [])

  // Lay out whichever level of the hierarchy is being viewed.
  useEffect(() => {
    if (!current) {
      setLayout(null)
      return
    }
    let cancelled = false
    const started = performance.now()
    layoutSchematic(buildSchematic(current))
      .then((result) => {
        if (cancelled) return
        setLayout(result)
        setTimings((t) => t && { ...t, layout: performance.now() - started })
      })
      .catch((err) => !cancelled && setError(`Layout failed: ${err instanceof Error ? err.message : err}`))
    return () => {
      cancelled = true
    }
  }, [current])

  // Picking an example only loads its code; nothing is drawn until Render is clicked.
  const handleExampleChange = (key: string) => {
    setSelectedExample(key)
    setCode(examples[key].code)
  }

  const handleClear = () => {
    request.current?.abort()
    setCode('')
    setDesign(null)
    setRenderedCode(null)
    setLayout(null)
    setError(null)
  }

  const navigate = (next: number[]) => {
    setPath(next)
    setSelectedNet(null)
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Editor
          code={code}
          selectedExample={selectedExample}
          examples={examples}
          loading={loading}
          onCodeChange={setCode}
          onExampleChange={handleExampleChange}
          onRender={() => render(code)}
          onClear={handleClear}
        />
        <Diagram
          design={design}
          trail={trail}
          layout={layout}
          error={error}
          loading={loading}
          timings={timings}
          stale={renderedCode !== null && renderedCode !== code}
          activeTab={activeTab}
          selectedNet={selectedNet}
          onTabChange={setActiveTab}
          onSelectNet={setSelectedNet}
          onNavigate={(depth) => navigate(path.slice(0, depth + 1))}
          onSelectTop={(index) => navigate([index])}
          onOpenInstance={(index) => navigate([...path, index])}
        />
      </div>
    </div>
  )
}

/** The instances from the top module down to the one being viewed. */
function resolvePath(design: ParseResponse | null, path: number[]): ModuleInstance[] {
  const top = design?.tops[path[0]]
  if (!top) return []
  const trail = [top]
  for (const index of path.slice(1)) {
    const child = trail[trail.length - 1].instances[index]
    if (!child) break
    trail.push(child)
  }
  return trail
}

function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-b border-slate-200 bg-white"
    >
      <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold">τ</div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">SchemaTeX</h1>
            <p className="text-xs text-slate-500">RTL Visualization Engine</p>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
