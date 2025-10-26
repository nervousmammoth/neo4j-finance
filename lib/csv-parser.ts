import Papa from 'papaparse'

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
  input: string | File,
  options: ParseOptions = {}
): Promise<ParseResult<T>> {
  // Validate input - handle null/undefined
  if (input === null || input === undefined) {
    return {
      success: false,
      data: [],
      errors: [
        {
          type: 'Error',
          code: 'INVALID_INPUT',
          message: 'Input cannot be null or undefined',
        },
      ],
      meta: {
        delimiter: '',
        linebreak: '',
        headers: [],
        rowCount: 0,
      },
    }
  }

  // Handle empty string input
  if (typeof input === 'string' && input.trim() === '') {
    return {
      success: false,
      data: [],
      errors: [
        {
          type: 'Validation',
          code: 'EMPTY_INPUT',
          message: 'CSV input is empty',
        },
      ],
      meta: {
        delimiter: '',
        linebreak: '',
        headers: [],
        rowCount: 0,
      },
    }
  }

  return new Promise((resolve) => {
    const config: Papa.ParseConfig = {
      header: options.header !== false,
      delimiter: options.delimiter || '',
      skipEmptyLines: options.skipEmptyLines !== false ? 'greedy' : false,
      transformHeader: options.transformHeader || ((h) => h.trim()),
      complete: (results) => {
        // Filter errors: only treat critical errors as failures
        // papaparse reports warnings like "TooFewFields", "FieldMismatch" which we want to handle gracefully
        // Critical errors: Quotes (unclosed quotes), Delimiter (couldn't detect)
        // Non-critical: FieldMismatch, TooFewFields, TooManyFields, etc.
        const criticalErrors = results.errors.filter(
          (err) => err.type === 'Quotes' || (err.type === 'Delimiter' && results.data.length === 0)
        )

        if (criticalErrors.length > 0 && results.data.length === 0) {
          // Only fail if there are critical errors AND no data was parsed
          resolve({
            success: false,
            data: [],
            errors: criticalErrors.map((err) => ({
              type: err.type,
              code: err.code,
              message: err.message,
              row: err.row,
            })),
            meta: {
              delimiter: results.meta.delimiter,
              linebreak: results.meta.linebreak,
              headers: results.meta.fields || [],
              rowCount: results.data.length,
            },
          })
        } else {
          // Return success with data, but include non-critical errors as warnings
          const warnings = results.errors.map((err) => ({
            type: err.type,
            code: err.code,
            message: err.message,
            row: err.row,
          }))

          resolve({
            success: true,
            data: results.data as T[],
            errors: warnings,
            meta: {
              delimiter: results.meta.delimiter,
              linebreak: results.meta.linebreak,
              headers: results.meta.fields || [],
              rowCount: results.data.length,
            },
          })
        }
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [
            {
              type: 'Error',
              code: 'PARSE_ERROR',
              message: error.message,
            },
          ],
          meta: {
            delimiter: '',
            linebreak: '',
            headers: [],
            rowCount: 0,
          },
        })
      },
    }

    if (typeof input === 'string') {
      Papa.parse(input, config)
    } else {
      Papa.parse(input, config)
    }
  })
}
