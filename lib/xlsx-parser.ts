import * as XLSX from 'xlsx'
import { buildErrorResponse, buildSuccessResponse, inferColumnTypes } from './parser-utils'

// Re-export shared types from CSV parser for consistency
export type { ParseResult, ParseError, ParseOptions } from './csv-parser'

// Constants for file format validation
const ZIP_MAGIC_BYTE_1 = 0x50 // 'P' - ZIP files start with "PK"
const ZIP_MAGIC_BYTE_2 = 0x4b // 'K'
const MIN_ZIP_HEADER_SIZE = 4

/**
 * Reads File object as ArrayBuffer with proper type validation
 */
async function readFileAsBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result)
      } else {
        reject(new Error('Failed to read file: result is not an ArrayBuffer'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Checks if a row is empty (all values are empty strings, null, or undefined)
 * @param row - The row object to check
 * @returns True if all values in the row are empty
 */
function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((val) => val === '' || val === null || val === undefined)
}

// processRow function no longer needed - cellDates: true + raw: true gives us the correct types directly

/**
 * Parses XLSX data from Buffer or File input with comprehensive validation and type handling
 *
 * Features:
 * - Validates XLSX format using ZIP magic bytes
 * - Parses first sheet only (multi-sheet support reserved for future)
 * - Converts Excel date serials to JavaScript Date objects automatically
 * - Preserves numeric values (not formatted strings)
 * - Handles merged cells (value in first cell of merge range)
 * - Includes hidden columns in output
 * - Supports header transformation and type inference
 * - Compatible with CSV parser's ParseResult interface
 *
 * @param input - XLSX Buffer or File object to parse
 * @param options - Parsing options:
 *   - header: Include headers (default: true)
 *   - transformHeader: Function to transform header names
 *   - skipEmptyLines: Skip rows with all empty values (default: true)
 *   - inferTypes: Automatically infer and convert column types (default: false)
 * @returns Promise resolving to ParseResult with data, errors, and metadata
 *
 * @example
 * ```typescript
 * const buffer = fs.readFileSync('data.xlsx')
 * const result = await parseXLSX(buffer, { inferTypes: true })
 * if (result.success) {
 *   console.log(`Parsed ${result.meta.rowCount} rows`)
 *   console.log(result.data)
 * }
 * ```
 */
export async function parseXLSX<T = Record<string, string | number>>(
  input: Buffer | File,
  options: import('./csv-parser').ParseOptions = {}
): Promise<import('./csv-parser').ParseResult<T>> {
  // Validate input
  if (input === null || input === undefined) {
    return buildErrorResponse(
      [
        {
          type: 'Error',
          code: 'INVALID_INPUT',
          message: 'Input cannot be null or undefined',
        },
      ],
      {},
      { delimiter: 'N/A', linebreak: 'N/A' }
    )
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
    if (bytes.length < MIN_ZIP_HEADER_SIZE || bytes[0] !== ZIP_MAGIC_BYTE_1 || bytes[1] !== ZIP_MAGIC_BYTE_2) {
      return buildErrorResponse(
        [
          {
            type: 'Error',
            code: 'PARSE_ERROR',
            message: 'Invalid XLSX file format (not a valid ZIP archive)',
          },
        ],
        {},
        { delimiter: 'N/A', linebreak: 'N/A' }
      )
    }

    // Parse XLSX workbook (cellDates: true converts Excel date serials to JS Dates)
    const workbook = XLSX.read(buffer, {
      type: input instanceof File ? 'array' : 'buffer',
      cellDates: true, // Automatically convert date cells to JS Date objects
    })

    // Validate workbook has sheets
    /* c8 ignore start - Defensive check; xlsx library always creates SheetNames array */
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return buildErrorResponse(
        [
          {
            type: 'Error',
            code: 'EMPTY_INPUT',
            message: 'XLSX file is empty or has no sheets',
          },
        ],
        {},
        { delimiter: 'N/A', linebreak: 'N/A' }
      )
    }
    /* c8 ignore stop */

    // Get first sheet only (as per requirements)
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Convert worksheet to JSON once with raw values (more efficient than calling twice)
    // The cellDates: true option already converts Excel dates to JS Date objects
    const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
      header: options.header !== false ? undefined : 1,
      defval: '', // Default value for empty cells
      raw: true, // Get raw values (numbers, dates already converted by cellDates: true)
    })

    // Check if worksheet is empty (no cell range)
    if (!worksheet['!ref']) {
      return buildErrorResponse(
        [
          {
            type: 'Validation',
            code: 'EMPTY_INPUT',
            message: 'XLSX file is empty',
          },
        ],
        {},
        { delimiter: 'N/A', linebreak: 'N/A' }
      )
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
          return buildErrorResponse(
            [
              {
                type: 'Validation',
                code: 'EMPTY_INPUT',
                message: 'XLSX file is empty',
              },
            ],
            {},
            { delimiter: 'N/A', linebreak: 'N/A' }
          )
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
      /* c8 ignore start - Unreachable: previous conditions handle all empty cases */

      return buildErrorResponse(
        [
          {
            type: 'Validation',
            code: 'EMPTY_INPUT',
            message: 'XLSX file is empty',
          },
        ],
        {},
        { delimiter: 'N/A', linebreak: 'N/A' }
      )
    }
    /* c8 ignore stop */

    // Extract headers
    const headers = Object.keys(rawData[0])

    // Data is already correctly typed from cellDates: true + raw: true
    // No need for processRow - dates are Date objects, numbers are numbers

    // Apply header transformation if provided
    let transformedData: Record<string, unknown>[] = rawData
    if (options.transformHeader) {
      transformedData = rawData.map((row) => {
        const transformedRow: Record<string, unknown> = {}
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
    // TypeScript: transformedData has unknown values, which are widened to proper types here
    let finalData: Record<string, string | number | boolean | Date>[] = transformedData as Record<
      string,
      string | number | boolean | Date
    >[]
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
    // Handle parsing errors - extract message from Error or use default
    /* c8 ignore next - Defensive: non-Error exceptions are extremely rare in practice */
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse XLSX file'

    return buildErrorResponse(
      [
        {
          type: 'Error',
          code: 'PARSE_ERROR',
          message: errorMessage,
        },
      ],
      {},
      { delimiter: 'N/A', linebreak: 'N/A' }
    )
  }
}
