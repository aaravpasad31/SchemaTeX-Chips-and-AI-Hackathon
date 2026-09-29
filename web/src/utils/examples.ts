import type { Example } from '../types'

// Sample designs are bundled as raw text from the repo: the curated examples/ folder,
// followed by the design test suite in tests/designs/ grouped by category.
const exampleSources = import.meta.glob<string>('../../../examples/*.sv', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const suiteSources = import.meta.glob<string>('../../../tests/designs/**/*.sv', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const TITLES: Record<string, string> = {
  counter_4bit: '4-bit counter (sequential)',
  mux_4to1: '4-to-1 mux (combinational)',
  traffic_light: 'Traffic light (state machine)',
  counter_chain: 'Counter chain (hierarchy)',
  shift_register: 'Shift register (generate loop)',
  processor: 'Processor (mixed hierarchy)',
}

const fileKey = (path: string) => path.slice(path.lastIndexOf('/') + 1, -'.sv'.length)

function orderOf(key: string) {
  const index = Object.keys(TITLES).indexOf(key)
  return index === -1 ? Infinity : index
}

const curated = Object.entries(exampleSources)
  .map(([path, code]) => {
    const key = fileKey(path)
    return [key, { name: TITLES[key] ?? key, group: 'Examples', code }] as const
  })
  .sort(([a], [b]) => orderOf(a) - orderOf(b))

const suite = Object.entries(suiteSources)
  .map(([path, code]) => {
    const [category, file] = path.split('/tests/designs/')[1].split('/')
    const key = `tests/${category}/${file}`
    return [key, { name: fileKey(file), group: `Test suite: ${category}`, code }] as const
  })
  .sort(([a], [b]) => a.localeCompare(b))

export const examples: Record<string, Example> = Object.fromEntries([...curated, ...suite])

export const DEFAULT_EXAMPLE = 'counter_4bit'
