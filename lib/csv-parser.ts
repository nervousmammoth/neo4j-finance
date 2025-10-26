import Papa from 'papaparse'
import { buildErrorResponse, buildSuccessResponse, inferColumnTypes } from './parser-utils'

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
  /** Enable streaming mode for large files (processes data in chunks) - RESERVED FOR FUTURE IMPLEMENTATION */
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
      complete: (results: Papa.ParseResult<T>) => {
        // Filter critical vs non-critical errors
        const criticalErrors = results.errors.filter((err: Papa.ParseError) =>
          isCriticalError(err, results.data.length)
        )

        if (criticalErrors.length > 0 && results.data.length === 0) {
          // Only fail if there are critical errors AND no data was parsed
          resolve(
            buildErrorResponse(
              criticalErrors.map((err: Papa.ParseError) => ({
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
            // Type inference changes string values to number/boolean/Date
            // Cast back to T[] as caller expects the generic type
            data = inferColumnTypes(data as unknown as Record<string, string>[]) as T[]
          }

          // Map non-critical errors to warnings
          const warnings = results.errors.map((err: Papa.ParseError) => ({
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
      error: (error: Error) => {
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
    } as Papa.ParseConfig

    // Type assertion needed due to Papa.parse overload complexity
    // Papa.parse correctly handles both string and File objects at runtime
    // TypeScript types don't properly reflect this, so we use 'any' cast
    // This is safe because papaparse internally handles both types correctly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Papa.parse(input as any, config)
  })
}
