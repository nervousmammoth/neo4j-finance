// Stub file for TDD RED phase - types only, no implementation yet
export interface ParseResult<T = Record<string, string>> {
  success: boolean
  data: T[]
  errors: ParseError[]
  meta: {
    delimiter: string
    linebreak: string
    headers: string[]
    rowCount: number
  }
}

export interface ParseError {
  type: string
  code: string
  message: string
  row?: number
}

export interface ParseOptions {
  header?: boolean
  delimiter?: string
  skipEmptyLines?: boolean
  transformHeader?: (header: string) => string
}

export async function parseCSV<T = Record<string, string>>(
  _input: string | File,
  _options?: ParseOptions
): Promise<ParseResult<T>> {
  // TODO: Implement CSV parsing - currently in RED phase
  throw new Error('Not implemented')
}
