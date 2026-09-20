export interface ParseResult {
  success: boolean
  modules?: any[]
  diagram?: any
  error?: string
  stages?: {
    parse?: { duration: number }
    total?: number
  }
}

export interface Example {
  name: string
  code: string
}
