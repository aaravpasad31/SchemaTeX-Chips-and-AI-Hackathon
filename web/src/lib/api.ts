import type { ParseResponse } from '../types'

const UNREACHABLE = 'Cannot reach the SchemaTeX server. Is it running on port 3001? (see README)'

/** Elaborate SystemVerilog source on the server (proxied to server/app.py in development). */
export async function parseDesign(code: string, signal?: AbortSignal): Promise<ParseResponse> {
  let response: Response
  try {
    response = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new Error(UNREACHABLE)
  }
  if (!response.ok) {
    // FastAPI errors carry a `detail`; anything else is the dev proxy failing to connect.
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? UNREACHABLE)
  }
  return response.json()
}
