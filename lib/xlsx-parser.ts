import * as XLSX from 'xlsx'

// Re-export shared types from CSV parser for consistency
export type { ParseResult, ParseError, ParseOptions } from './csv-parser'

/**
 * Builds an error response for parsing failures
 */
function buildErrorResponse<T>(
  errors: import('./csv-parser').ParseError[],
  meta: Partial<import('./csv-parser').ParseResult<T>['meta']> = {}
): import('./csv-parser').ParseResult<T> {
  return {
    success: false,
    data: [],
    errors,
    meta: {
      delimiter: 'N/A',
      linebreak: 'N/A',
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
  errors: import('./csv-parser').ParseError[],
  meta: import('./csv-parser').ParseResult<T>['meta']
): import('./csv-parser').ParseResult<T> {
  return {
    success: true,
    data,
    errors,
    meta,
  }
}

/**
 * Infers and converts column values to appropriate types
 * (Reused from CSV parser logic - ideally would be shared utility)
 */
function inferColumnTypes(
  data: Record<string, string | number>[]
): Record<string, string | number | boolean | Date>[] {
  if (data.length === 0) return []

  const firstRow = data[0]
  if (typeof firstRow !== 'object' || firstRow === null || Array.isArray(firstRow)) return data

  const columns = Object.keys(firstRow)
  const columnTypes: Record<string, 'number' | 'boolean' | 'date' | 'string'> = {}

  // Determine type for each column
  columns.forEach((col) => {
    let isNumber = true
    let isBoolean = true
    let isDate = true

    for (const row of data) {
      const value = row[col]
      // Handle already-numeric values from XLSX
      if (value === '' || value === null || value === undefined) continue

      const valueStr = String(value)

      // Check number
      if (isNumber && (isNaN(Number(valueStr)) || valueStr.trim() === '')) {
        isNumber = false
      }

      // Check boolean
      if (isBoolean && !['true', 'false', '0', '1', 'yes', 'no'].includes(valueStr.toLowerCase())) {
        isBoolean = false
      }

      // Check date - exclude plain numeric strings
      if (isDate && (isNaN(Date.parse(valueStr)) || /^\d+$/.test(valueStr.trim()))) {
        isDate = false
      }

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
    const converted: Record<string, string | number | boolean | Date> = { ...row }
    columns.forEach((col) => {
      const value = row[col]
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

/**
 * Reads File object as ArrayBuffer
 */
async function readFileAsBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Checks if a row is empty (all values are empty strings or undefined)
 */
function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((val) => val === '' || val === null || val === undefined)
}

/**
 * Parses XLSX data from Buffer or File input
 * @param input - XLSX Buffer or File object to parse
 * @param options - Parsing options (headers, type inference, etc.)
 * @returns Promise resolving to ParseResult with data, errors, and metadata
 */
export async function parseXLSX<T = Record<string, string | number>>(
  input: Buffer | File,
  options: import('./csv-parser').ParseOptions = {}
): Promise<import('./csv-parser').ParseResult<T>> {
  // Validate input
  if (input === null || input === undefined) {
    return buildErrorResponse([
      {
        type: 'Error',
        code: 'INVALID_INPUT',
        message: 'Input cannot be null or undefined',
      },
    ])
  }

  try {
    // Convert File to ArrayBuffer if needed
    let buffer: ArrayBuffer | Buffer
    if (input instanceof File) {
      buffer = await readFileAsBuffer(input)
    } else {
      buffer = input
    }

    // Validate XLSX file format (XLSX files are ZIP files, start with 'PK' signature)
    const bytes = buffer instanceof Buffer ? buffer : Buffer.from(new Uint8Array(buffer))
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      return buildErrorResponse([
        {
          type: 'Error',
          code: 'PARSE_ERROR',
          message: 'Invalid XLSX file format (not a valid ZIP archive)',
        },
      ])
    }

    // Parse XLSX workbook (cellDates: true converts Excel date serials to JS Dates)
    const workbook = XLSX.read(buffer, {
      type: input instanceof File ? 'array' : 'buffer',
      cellDates: true, // Automatically convert date cells to JS Date objects
    })

    // Validate workbook has sheets
    /* c8 ignore start - Defensive check; xlsx library always creates SheetNames array */
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return buildErrorResponse([
        {
          type: 'Error',
          code: 'EMPTY_INPUT',
          message: 'XLSX file is empty or has no sheets',
        },
      ])
    }
    /* c8 ignore stop */

    // Get first sheet only (as per requirements)
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Convert worksheet to JSON with both raw values and cell info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      header: options.header !== false ? undefined : 1,
      defval: '', // Default value for empty cells
      raw: false, // Use formatted values to preserve type info
    })

    // Also get raw numeric values for cells that need them
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawNumericData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      header: options.header !== false ? undefined : 1,
      defval: '',
      raw: true, // Get raw numeric values
    })

    // Check if worksheet is empty (no cell range)
    if (!worksheet['!ref']) {
      return buildErrorResponse([
        {
          type: 'Validation',
          code: 'EMPTY_INPUT',
          message: 'XLSX file is empty',
        },
      ])
    }

    // Check if data is empty (only headers or completely empty)
    if (rawData.length === 0) {
      // Try to extract headers from the first row
      const range = XLSX.utils.decode_range(worksheet['!ref'])
      const headers: string[] = []

      if (range.s.r === range.e.r) {
        // Only one row - these are headers
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
          const cell = worksheet[cellAddress]
          headers.push(cell ? String(cell.v) : '')
        }

        // If all headers are empty, it's an empty file
        if (headers.every((h) => h === '')) {
          return buildErrorResponse([
            {
              type: 'Validation',
              code: 'EMPTY_INPUT',
              message: 'XLSX file is empty',
            },
          ])
        }

        return buildSuccessResponse(
          [],
          [],
          {
            delimiter: 'N/A',
            linebreak: 'N/A',
            headers: headers.map((h) => (options.transformHeader ? options.transformHeader(h) : h)),
            rowCount: 0,
          }
        )
      }

      /* c8 ignore start - Defensive fallback; previous conditions should catch all empty cases */
      return buildErrorResponse([
        {
          type: 'Validation',
          code: 'EMPTY_INPUT',
          message: 'XLSX file is empty',
        },
      ])
    }
    /* c8 ignore stop */

    // Extract headers
    const headers = Object.keys(rawData[0])

    // Process data to handle dates and numbers correctly BEFORE transformations
    // Merge raw numeric values with formatted strings and detect dates
    const processedData = rawData.map((row, rowIndex) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRow: Record<string, any> = {}
      const rawNumericRow = rawNumericData[rowIndex]

      Object.entries(row).forEach(([key, value]) => {
        // Get raw value for this cell (could be number, Date, or other type)
        const rawValue = rawNumericRow?.[key]

        // Prefer Date objects from raw data (cellDates: true converts them)
        if (rawValue instanceof Date) {
          newRow[key] = rawValue
        }
        // For numeric cells that were formatted as strings, use raw numeric value
        else if (typeof rawValue === 'number' && typeof value === 'string') {
          newRow[key] = rawValue
        }
        // Otherwise use the formatted value
        else {
          newRow[key] = value
        }
      })
      return newRow
    })

    // Apply header transformation if provided
    let transformedData = processedData
    if (options.transformHeader) {
      transformedData = processedData.map((row) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedRow: Record<string, any> = {}
        Object.keys(row).forEach((key) => {
          const newKey = options.transformHeader!(key)
          transformedRow[newKey] = row[key]
        })
        return transformedRow
      })
    }

    // Skip empty lines if requested
    if (options.skipEmptyLines !== false) {
      transformedData = transformedData.filter((row) => !isEmptyRow(row))
    }

    // Apply type inference if requested
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalData: any[] = transformedData
    if (options.inferTypes) {
      finalData = inferColumnTypes(transformedData as Record<string, string | number>[])
    }

    // Build successful response
    const transformedHeaders = options.transformHeader
      ? headers.map((h) => options.transformHeader!(h))
      : headers

    return buildSuccessResponse(finalData as T[], [], {
      delimiter: 'N/A', // Not applicable for XLSX
      linebreak: 'N/A', // Not applicable for XLSX
      headers: transformedHeaders,
      rowCount: finalData.length,
    })
  } catch (error) {
    // Handle parsing errors
    return buildErrorResponse([
      {
        type: 'Error',
        code: 'PARSE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to parse XLSX file',
      },
    ])
  }
}
