import type { ParseResult, ParseError } from './csv-parser'

/**
 * Builds an error response for parsing failures
 *
 * @param errors - Array of parse errors that occurred
 * @param meta - Optional partial metadata (delimiter, linebreak, headers, rowCount)
 * @param defaults - Default values for delimiter and linebreak when not provided
 * @returns ParseResult with success=false, empty data array, and error information
 *
 * @example
 * ```typescript
 * buildErrorResponse([{
 *   type: 'Error',
 *   code: 'INVALID_INPUT',
 *   message: 'Input cannot be null'
 * }])
 * ```
 */
export function buildErrorResponse<T>(
  errors: ParseError[],
  meta: Partial<ParseResult<T>['meta']> = {},
  defaults: { delimiter?: string; linebreak?: string } = {}
): ParseResult<T> {
  return {
    success: false,
    data: [],
    errors,
    meta: {
      delimiter: meta.delimiter ?? defaults.delimiter ?? '',
      linebreak: meta.linebreak ?? defaults.linebreak ?? '',
      headers: meta.headers || [],
      rowCount: meta.rowCount || 0,
    },
  }
}

/**
 * Builds a success response with parsed data
 *
 * @param data - Successfully parsed data rows
 * @param errors - Non-critical errors/warnings that occurred during parsing
 * @param meta - Metadata about the parsed file (delimiter, linebreak, headers, rowCount)
 * @returns ParseResult with success=true and the parsed data
 *
 * @example
 * ```typescript
 * buildSuccessResponse(
 *   [{name: 'Alice', age: 30}],
 *   [],
 *   {delimiter: ',', linebreak: '\n', headers: ['name', 'age'], rowCount: 1}
 * )
 * ```
 */
export function buildSuccessResponse<T>(
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
 *
 * Detects and converts:
 * - Booleans: 'true', 'false', '0', '1', 'yes', 'no' (case-insensitive)
 * - Numbers: Numeric strings that parse successfully
 * - Dates: Valid date strings (excludes plain numeric strings to avoid false positives)
 * - Strings: Everything else
 *
 * Priority order: boolean > number > date > string
 *
 * @param data - Array of row objects with string or number values
 * @returns Array of row objects with inferred types (string | number | boolean | Date)
 *
 * @example
 * ```typescript
 * const input = [{age: '30', active: 'true', date: '2024-01-01'}]
 * const output = inferColumnTypes(input)
 * // [{age: 30, active: true, date: Date('2024-01-01')}]
 * ```
 */
export function inferColumnTypes(
  data: Record<string, string | number>[]
): Record<string, string | number | boolean | Date>[] {
  if (data.length === 0) return []

  const firstRow = data[0]
  if (typeof firstRow !== 'object' || firstRow === null || Array.isArray(firstRow)) return data

  const columns = Object.keys(firstRow)
  const columnTypes: Record<string, 'number' | 'boolean' | 'date' | 'string'> = {}

  // Determine type for each column by checking all values
  columns.forEach((col) => {
    let isNumber = true
    let isBoolean = true
    let isDate = true

    for (const row of data) {
      const value = row[col]
      // Skip empty/null/undefined values - they don't affect type inference
      if (value === '' || value === null || value === undefined) continue

      // Convert to string for consistent type checking (handles both string and number inputs)
      const valueStr = String(value)

      // Check if value can be parsed as a number
      if (isNumber && (isNaN(Number(valueStr)) || valueStr.trim() === '')) {
        isNumber = false
      }

      // Check if value is a boolean-like string
      if (isBoolean && !['true', 'false', '0', '1', 'yes', 'no'].includes(valueStr.toLowerCase())) {
        isBoolean = false
      }

      // Check if value is a date string
      // Exclude plain numeric strings (e.g., '123') to avoid false positives
      if (isDate && (isNaN(Date.parse(valueStr)) || /^\d+$/.test(valueStr.trim()))) {
        isDate = false
      }

      // Early exit optimization if none of the types match
      if (!isNumber && !isBoolean && !isDate) break
    }

    // Assign type with priority: boolean > number > date > string
    if (isBoolean) columnTypes[col] = 'boolean'
    else if (isNumber) columnTypes[col] = 'number'
    else if (isDate) columnTypes[col] = 'date'
    else columnTypes[col] = 'string'
  })

  // Convert values based on inferred types
  return data.map((row) => {
    const converted: Record<string, string | number | boolean | Date> = { ...row }
    columns.forEach((col) => {
      const value = row[col]
      // Skip empty/null/undefined values
      if (value === '' || value === null || value === undefined) return

      const valueStr = String(value)

      switch (columnTypes[col]) {
        case 'number':
          converted[col] = Number(valueStr)
          break
        case 'boolean':
          converted[col] = ['true', '1', 'yes'].includes(valueStr.toLowerCase())
          break
        case 'date':
          converted[col] = new Date(valueStr)
          break
        // string: no conversion needed
      }
    })
    return converted
  })
}
