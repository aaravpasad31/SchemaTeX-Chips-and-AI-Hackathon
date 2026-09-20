import { useState } from 'react'
import { motion } from 'framer-motion'
import Editor from './components/Editor'
import Diagram from './components/Diagram'

const examples: Record<string, { name: string; code: string }> = {
  counter_4bit: {
    name: '4-bit Counter',
    code: `module counter_4bit (
    input wire clk,
    input wire reset,
    input wire enable,
    output logic [3:0] count
);

    logic [3:0] count_next;

    always_comb begin
        if (reset) begin
            count_next = 4'b0000;
        end else if (enable) begin
            count_next = count + 1;
        end else begin
            count_next = count;
        end
    end

    always_ff @(posedge clk) begin
        count <= count_next;
    end

endmodule`,
  },
  hierarchical: {
    name: 'Hierarchical',
    code: `module top_level (
    input  wire       clk,
    input  wire [7:0] data_in,
    output wire [7:0] data_out
);

    alu_unit alu_inst (
        .clk(clk),
        .a(data_in),
        .b(8'h00),
        .result()
    );

    memory_unit mem_inst (
        .clk(clk),
        .addr(3'b000),
        .data_out(data_out)
    );

    control_unit ctrl_inst (
        .clk(clk),
        .enable(1'b1)
    );

endmodule`,
  },
  mux: {
    name: 'Combinational',
    code: `module mux_4to1 (
    input  wire [1:0] sel,
    input  wire [7:0] a,
    input  wire [7:0] b,
    input  wire [7:0] c,
    input  wire [7:0] d,
    output logic [7:0] out
);

    always_comb begin
        case (sel)
            2'b00: out = a;
            2'b01: out = b;
            2'b10: out = c;
            2'b11: out = d;
            default: out = 8'b0;
        endcase
    end

endmodule`,
  },
}

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

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to render diagram')
      } else {
        setResult(data)
        setStats({
          parseTime: data.stages.parse?.duration || 0,
          total: data.stages.total || 0,
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
