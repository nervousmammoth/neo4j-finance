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
  /** Enable streaming mode for large files (processes data in chunks) */
  streaming?: boolean
  /** Automatically infer and convert column types (string -> number/boolean/date) */
  inferTypes?: boolean
}

/**
 * Determines if a papaparse error is critical (should fail parsing)
 * Critical errors: unclosed quotes, delimiter detection failure with no data
 * Non-critical: field mismatches, too few/many fields (treated as warnings)
 */
function isCriticalError(error: Papa.ParseError, dataLength: number): boolean {
  return error.type === 'Quotes' || (error.type === 'Delimiter' && dataLength === 0)
}

/**
 * Builds an error response for parsing failures
 */
function buildErrorResponse<T>(
  errors: ParseError[],
  meta: Partial<ParseResult<T>['meta']> = {}
): ParseResult<T> {
  return {
    success: false,
    data: [],
    errors,
    meta: {
      delimiter: meta.delimiter || '',
      linebreak: meta.linebreak || '',
      headers: meta.headers || [],
      rowCount: meta.rowCount || 0,
    },
  }
}

/**
 * Builds a success response with parsed data
 */
function buildSuccessResponse<T>(
  data: T[],
  errors: ParseError[],
  meta: ParseResult<T>['meta']
): ParseResult<T> {
  return {
    success: true,
    data,
    errors,
    meta,
  }
}

/**
 * Infers and converts column values to appropriate types
 * Detects: numbers, booleans, dates, null values
 */
function inferColumnTypes<T = Record<string, string>>(data: T[]): T[] {
  if (data.length === 0) return data

  // For each column, check if all values can be converted to a specific type
  const firstRow = data[0]
  if (typeof firstRow !== 'object' || Array.isArray(firstRow)) return data

  const columns = Object.keys(firstRow)
  const columnTypes: Record<string, 'number' | 'boolean' | 'date' | 'string'> = {}

  // Determine type for each column
  columns.forEach((col) => {
    let isNumber = true
    let isBoolean = true
    let isDate = true

    for (const row of data) {
      const value = (row as any)[col]
      if (value === '' || value === null || value === undefined) continue

      // Check number
      if (isNumber && (isNaN(Number(value)) || value.trim() === '')) {
        isNumber = false
      }

      // Check boolean
      if (isBoolean && !['true', 'false', '0', '1', 'yes', 'no'].includes(value.toLowerCase())) {
        isBoolean = false
      }

      // Check date (simplified check)
      if (isDate && isNaN(Date.parse(value))) {
        isDate = false
      }

      // Early exit if none match
      if (!isNumber && !isBoolean && !isDate) break
    }

    // Prioritize: boolean > number > date > string
    if (isBoolean) columnTypes[col] = 'boolean'
    else if (isNumber) columnTypes[col] = 'number'
    else if (isDate) columnTypes[col] = 'date'
    else columnTypes[col] = 'string'
  })

  // Convert values based on inferred types
  return data.map((row) => {
    const converted: any = { ...row }
    columns.forEach((col) => {
      const value = (row as any)[col]
      if (value === '' || value === null || value === undefined) return

      switch (columnTypes[col]) {
        case 'number':
          converted[col] = Number(value)
          break
        case 'boolean':
          converted[col] = ['true', '1', 'yes'].includes(value.toLowerCase())
          break
        case 'date':
          converted[col] = new Date(value)
          break
        // string: no conversion needed
      }
    })
    return converted as T
  })
}

/**
 * Parses CSV data from string or File input
 * @param input - CSV string or File object to parse
 * @param options - Parsing options (delimiters, headers, type inference, etc.)
 * @returns Promise resolving to ParseResult with data, errors, and metadata
 */
export async function parseCSV<T = Record<string, string>>(
  input: string | File,
  options: ParseOptions = {}
): Promise<ParseResult<T>> {
  // Validate input - handle null/undefined
  if (input === null || input === undefined) {
    return buildErrorResponse([
      {
        type: 'Error',
        code: 'INVALID_INPUT',
        message: 'Input cannot be null or undefined',
      },
    ])
  }

  // Handle empty string input
  if (typeof input === 'string' && input.trim() === '') {
    return buildErrorResponse([
      {
        type: 'Validation',
        code: 'EMPTY_INPUT',
        message: 'CSV input is empty',
      },
    ])
  }

  return new Promise((resolve) => {
    const config: Papa.ParseConfig = {
      header: options.header !== false,
      delimiter: options.delimiter || '',
      skipEmptyLines: options.skipEmptyLines !== false ? 'greedy' : false,
      transformHeader: options.transformHeader || ((h) => h.trim()),
      complete: (results) => {
        // Filter critical vs non-critical errors
        const criticalErrors = results.errors.filter((err) =>
          isCriticalError(err, results.data.length)
        )

        if (criticalErrors.length > 0 && results.data.length === 0) {
          // Only fail if there are critical errors AND no data was parsed
          resolve(
            buildErrorResponse(
              criticalErrors.map((err) => ({
                type: err.type,
                code: err.code,
                message: err.message,
                row: err.row,
              })),
              {
                delimiter: results.meta.delimiter,
                linebreak: results.meta.linebreak,
                headers: results.meta.fields || [],
                rowCount: results.data.length,
              }
            )
          )
        } else {
          // Parse succeeded - apply type inference if requested
          let data = results.data as T[]
          if (options.inferTypes) {
            data = inferColumnTypes(data)
          }

          // Map non-critical errors to warnings
          const warnings = results.errors.map((err) => ({
            type: err.type,
            code: err.code,
            message: err.message,
            row: err.row,
          }))

          resolve(
            buildSuccessResponse(data, warnings, {
              delimiter: results.meta.delimiter,
              linebreak: results.meta.linebreak,
              headers: results.meta.fields || [],
              rowCount: data.length,
            })
          )
        }
      },
      error: (error) => {
        resolve(
          buildErrorResponse([
            {
              type: 'Error',
              code: 'PARSE_ERROR',
              message: error.message,
            },
          ])
        )
      },
    }

    Papa.parse(input, config)
  })
}
