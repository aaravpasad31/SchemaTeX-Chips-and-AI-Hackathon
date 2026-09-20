import { useState } from 'react'
import { motion } from 'framer-motion'
import Editor from './components/Editor'
import Diagram from './components/Diagram'
import { examples } from './utils/examples'
import type { ParseResult } from './types'

export default function App() {
  const [code, setCode] = useState(examples['counter_4bit'].code)
  const [selectedExample, setSelectedExample] = useState('counter_4bit')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('diagram')
  const [stats, setStats] = useState<any>(null)

  const handleExampleChange = (key: string) => {
    setSelectedExample(key)
    setCode(examples[key].code)
  }

  const handleRender = async () => {
    if (!code.trim()) {
      setError('Please enter some SystemVerilog code')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('http://localhost:3001/api/full-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data: ParseResult = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to render diagram')
      } else {
        setResult(data)
        setStats({
          parseTime: data.stages?.parse?.duration || 0,
          total: data.stages?.total || 0,
        })
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setCode('')
    setResult(null)
    setError(null)
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
          onRender={handleRender}
          onClear={handleClear}
        />
        <Diagram
          result={result}
          error={error}
          loading={loading}
          stats={stats}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  )
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

        <div className="flex items-center gap-4 text-sm">
          <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">
            Docs
          </a>
          <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">
            GitHub
          </a>
        </div>
      </div>
    </motion.header>
  )
}
