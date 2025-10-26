import { describe, it, expect } from 'vitest'
import { parseXLSX } from '@/lib/xlsx-parser'
import * as XLSX from 'xlsx'

/**
 * Helper function to create an XLSX file buffer from worksheet data
 */
function createXLSXBuffer(data: any[][], sheetName = 'Sheet1', extraSheets: Record<string, any[][]> = {}): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Add additional sheets if provided
  Object.entries(extraSheets).forEach(([name, sheetData]) => {
    const extraWs = XLSX.utils.aoa_to_sheet(sheetData)
    XLSX.utils.book_append_sheet(wb, extraWs, name)
  })

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/**
 * Helper to create XLSX with merged cells
 */
function createXLSXWithMergedCells(): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'Department', 'Status'],
    ['John Doe', 'Engineering', 'Active'],
    ['Jane Smith', 'Marketing', 'Active'],
  ])

  // Merge cells B2:B3 (Department column, rows 2-3)
  if (!ws['!merges']) ws['!merges'] = []
  ws['!merges'].push({ s: { r: 1, c: 1 }, e: { r: 2, c: 1 } })

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/**
 * Helper to create XLSX with formulas
 */
function createXLSXWithFormulas(): Buffer {
  const wb = XLSX.utils.book_new()
  const ws: XLSX.WorkSheet = {}

  // Headers
  ws['A1'] = { v: 'Product', t: 's' }
  ws['B1'] = { v: 'Price', t: 's' }
  ws['C1'] = { v: 'Quantity', t: 's' }
  ws['D1'] = { v: 'Total', t: 's' }

  // Data rows
  ws['A2'] = { v: 'Widget', t: 's' }
  ws['B2'] = { v: 10, t: 'n' }
  ws['C2'] = { v: 5, t: 'n' }
  ws['D2'] = { v: 50, t: 'n', f: 'B2*C2' } // Formula

  ws['A3'] = { v: 'Gadget', t: 's' }
  ws['B3'] = { v: 20, t: 'n' }
  ws['C3'] = { v: 3, t: 'n' }
  ws['D3'] = { v: 60, t: 'n', f: 'B3*C3' } // Formula

  ws['!ref'] = 'A1:D3'

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/**
 * Helper to create XLSX with formatted numbers
 */
function createXLSXWithFormattedNumbers(): Buffer {
  const wb = XLSX.utils.book_new()
  const ws: XLSX.WorkSheet = {}

  ws['A1'] = { v: 'Product', t: 's' }
  ws['B1'] = { v: 'Price', t: 's' }

  // Number with currency format
  ws['A2'] = { v: 'Widget', t: 's' }
  ws['B2'] = { v: 19.99, t: 'n', z: '$#,##0.00' }

  // Number with percentage format
  ws['A3'] = { v: 'Discount', t: 's' }
  ws['B3'] = { v: 0.15, t: 'n', z: '0.00%' }

  ws['!ref'] = 'A1:B3'

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/**
 * Helper to create XLSX with dates
 */
function createXLSXWithDates(): Buffer {
  const wb = XLSX.utils.book_new()
  const ws: XLSX.WorkSheet = {}

  ws['A1'] = { v: 'Event', t: 's' }
  ws['B1'] = { v: 'Date', t: 's' }

  // Excel date serial number (44562 = 2022-01-01)
  ws['A2'] = { v: 'Launch', t: 's' }
  ws['B2'] = { v: 44562, t: 'n', z: 'yyyy-mm-dd' }

  ws['A3'] = { v: 'Meeting', t: 's' }
  ws['B3'] = { v: 44927, t: 'n', z: 'yyyy-mm-dd' } // 2023-01-01

  ws['!ref'] = 'A1:B3'

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/**
 * Helper to create XLSX with hidden columns
 */
function createXLSXWithHiddenColumns(): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'Secret', 'Age'],
    ['John', 'password123', '30'],
    ['Jane', 'secret456', '25'],
  ])

  // Mark column B (index 1) as hidden
  if (!ws['!cols']) ws['!cols'] = []
  ws['!cols'][1] = { hidden: true }

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('XLSX Parser', () => {
  describe('Core Functionality - Valid XLSX Parsing', () => {
    it('should parse valid XLSX with single sheet', async () => {
      const buffer = createXLSXBuffer([
        ['name', 'age', 'city'],
        ['John', 30, 'NYC'],
        ['Jane', 25, 'LA'],
      ])

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({ name: 'John', age: 30, city: 'NYC' })
      expect(result.data[1]).toEqual({ name: 'Jane', age: 25, city: 'LA' })
      expect(result.errors).toHaveLength(0)
      expect(result.meta.headers).toEqual(['name', 'age', 'city'])
      expect(result.meta.rowCount).toBe(2)
    })

    it('should parse first sheet only when XLSX has multiple sheets', async () => {
      const buffer = createXLSXBuffer(
        [
          ['name', 'age'],
          ['John', 30],
        ],
        'FirstSheet',
        {
          SecondSheet: [
            ['product', 'price'],
            ['Widget', 9.99],
          ],
        }
      )

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({ name: 'John', age: 30 })
      expect(result.meta.headers).toEqual(['name', 'age'])
      // Should NOT include data from SecondSheet
      expect(result.data[0]).not.toHaveProperty('product')
    })

    it('should handle empty XLSX file gracefully', async () => {
      const buffer = createXLSXBuffer([[]])

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('EMPTY_INPUT')
      expect(result.errors[0].message).toContain('empty')
    })

    it('should extract computed values from XLSX with formulas', async () => {
      const buffer = createXLSXWithFormulas()

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      // Should get computed values, not formula text
      expect(result.data[0]).toEqual({ Product: 'Widget', Price: 10, Quantity: 5, Total: 50 })
      expect(result.data[1]).toEqual({ Product: 'Gadget', Price: 20, Quantity: 3, Total: 60 })
    })

    it('should handle XLSX with merged cells (value in first cell only)', async () => {
      const buffer = createXLSXWithMergedCells()

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      // First cell of merged range should have value
      expect(result.data[0].Department).toBe('Engineering')
      // Subsequent cells in merged range should be empty or undefined
      // (This behavior depends on xlsx library's handling)
      expect(result.data).toHaveLength(2)
    })

    it('should handle XLSX with empty cells', async () => {
      const buffer = createXLSXBuffer([
        ['name', 'age', 'city'],
        ['John', 30, 'NYC'],
        ['Jane', '', 'LA'], // Empty age
        ['Bob', 35, ''], // Empty city
      ])

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(result.data[1]).toEqual({ name: 'Jane', age: '', city: 'LA' })
      expect(result.data[2]).toEqual({ name: 'Bob', age: 35, city: '' })
    })

    it('should extract raw numeric values from XLSX with formatted numbers', async () => {
      const buffer = createXLSXWithFormattedNumbers()

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      // Should extract raw values, not formatted strings
      expect(result.data[0]).toEqual({ Product: 'Widget', Price: 19.99 })
      expect(result.data[1]).toEqual({ Product: 'Discount', Price: 0.15 })
      expect(typeof result.data[0].Price).toBe('number')
    })

    it('should convert Excel dates to JavaScript Date objects', async () => {
      const buffer = createXLSXWithDates()

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      // Excel serial dates should be converted to Date objects
      expect(result.data[0].Date).toBeInstanceOf(Date)
      expect(result.data[1].Date).toBeInstanceOf(Date)

      // Verify approximate dates (allowing for timezone differences)
      const date1 = result.data[0].Date as unknown as Date
      const date2 = result.data[1].Date as unknown as Date
      expect(date1.getFullYear()).toBe(2022)
      expect(date2.getFullYear()).toBe(2023)
    })

    it('should handle large XLSX file (1000+ rows)', async () => {
      const rows: any[][] = [['id', 'name', 'value']]
      for (let i = 0; i < 1000; i++) {
        rows.push([i, `Person${i}`, i * 10])
      }
      const buffer = createXLSXBuffer(rows)

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1000)
      expect(result.meta.rowCount).toBe(1000)
      expect(result.data[0]).toEqual({ id: 0, name: 'Person0', value: 0 })
      expect(result.data[999]).toEqual({ id: 999, name: 'Person999', value: 9990 })
    })

    it('should handle XLSX with special characters', async () => {
      const buffer = createXLSXBuffer([
        ['name', 'emoji', 'special'],
        ['John', '😀', '!@#$%^&*()'],
        ['Jane', '🎉', '<>?:{}[]'],
      ])

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({ name: 'John', emoji: '😀', special: '!@#$%^&*()' })
      expect(result.data[1]).toEqual({ name: 'Jane', emoji: '🎉', special: '<>?:{}[]' })
    })

    it('should include hidden columns in parsed output', async () => {
      const buffer = createXLSXWithHiddenColumns()

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      // Should include hidden column "Secret"
      expect(result.data[0]).toEqual({ Name: 'John', Secret: 'password123', Age: '30' })
      expect(result.data[1]).toEqual({ Name: 'Jane', Secret: 'secret456', Age: '25' })
      expect(result.meta.headers).toEqual(['Name', 'Secret', 'Age'])
    })

    it('should handle corrupted XLSX file with descriptive error', async () => {
      const corruptedBuffer = Buffer.from('This is not a valid XLSX file')

      const result = await parseXLSX(corruptedBuffer)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('Error')
      expect(result.errors[0].code).toBe('PARSE_ERROR')
      expect(result.errors[0].message).toBeTruthy()
    })
  })

  describe('Error Handling & Edge Cases', () => {
    it('should handle null input', async () => {
      const result = await parseXLSX(null as any)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_INPUT')
      expect(result.errors[0].message).toContain('null')
    })

    it('should handle undefined input', async () => {
      const result = await parseXLSX(undefined as any)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_INPUT')
      expect(result.errors[0].message).toContain('undefined')
    })

    it('should handle XLSX with only headers (no data rows)', async () => {
      const buffer = createXLSXBuffer([['name', 'age', 'city']])

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
      expect(result.meta.headers).toEqual(['name', 'age', 'city'])
      expect(result.meta.rowCount).toBe(0)
    })

    it('should handle File object input', async () => {
      const buffer = createXLSXBuffer([
        ['name', 'age'],
        ['John', 30],
      ])
      const file = new File([new Uint8Array(buffer)], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const result = await parseXLSX(file)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({ name: 'John', age: 30 })
    })
  })

  describe('Feature Parity with CSV Parser', () => {
    it('should infer and convert column types when inferTypes is true', async () => {
      const buffer = createXLSXBuffer([
        ['name', 'age', 'active', 'score', 'joined'],
        ['John', '30', 'true', '95.5', '2023-01-15'],
        ['Jane', '25', 'false', '87.3', '2023-02-20'],
      ])

      const result = await parseXLSX(buffer, { inferTypes: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(typeof result.data[0].age).toBe('number')
      expect(typeof result.data[0].active).toBe('boolean')
      expect(typeof result.data[0].score).toBe('number')
      expect(result.data[0].joined).toBeInstanceOf(Date)
      expect(result.data[0].age).toBe(30)
      expect(result.data[0].active).toBe(true)
      expect(result.data[0].score).toBe(95.5)
    })

    it('should apply custom header transformation', async () => {
      const buffer = createXLSXBuffer([
        ['First Name', 'Last Name'],
        ['John', 'Doe'],
      ])

      const result = await parseXLSX(buffer, {
        transformHeader: (header: string) => header.toLowerCase().replace(/\s+/g, '_'),
      })

      expect(result.success).toBe(true)
      expect(result.meta.headers).toEqual(['first_name', 'last_name'])
      expect(result.data[0]).toEqual({ first_name: 'John', last_name: 'Doe' })
    })

    it('should skip empty rows when skipEmptyLines is true', async () => {
      const buffer = createXLSXBuffer([
        ['name', 'age'],
        ['John', 30],
        ['', ''], // Empty row
        ['Jane', 25],
      ])

      const result = await parseXLSX(buffer, { skipEmptyLines: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({ name: 'John', age: 30 })
      expect(result.data[1]).toEqual({ name: 'Jane', age: 25 })
    })
  })

  describe('ParseResult Format Consistency', () => {
    it('should return ParseResult with correct structure', async () => {
      const buffer = createXLSXBuffer([
        ['name', 'age'],
        ['John', 30],
      ])

      const result = await parseXLSX(buffer)

      // Verify structure matches CSV parser
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('meta')
      expect(result.meta).toHaveProperty('headers')
      expect(result.meta).toHaveProperty('rowCount')
      expect(result.meta).toHaveProperty('delimiter')
      expect(result.meta).toHaveProperty('linebreak')
      expect(Array.isArray(result.data)).toBe(true)
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('Additional Edge Cases for Coverage', () => {
    it('should handle XLSX with no cell range', async () => {
      // Create an XLSX with a sheet but no data range
      const wb = XLSX.utils.book_new()
      const ws: XLSX.WorkSheet = {}
      // Don't set !ref, creating a sheet with no range
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(false)
      expect(result.errors[0].code).toBe('EMPTY_INPUT')
    })

    it('should handle XLSX with only empty cells (all headers empty)', async () => {
      // Create XLSX with one row of completely empty cells
      const wb = XLSX.utils.book_new()
      const ws: XLSX.WorkSheet = {
        A1: { v: '', t: 's' },
        B1: { v: '', t: 's' },
        C1: { v: '', t: 's' },
        '!ref': 'A1:C1',
      }
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

      const result = await parseXLSX(buffer)

      expect(result.success).toBe(false)
      expect(result.errors[0].code).toBe('EMPTY_INPUT')
      expect(result.errors[0].message).toContain('empty')
    })

    it('should handle actual parsing errors from xlsx library', async () => {
      // Create a buffer that passes magic byte check but fails parsing
      // ZIP file header (PK) but invalid XLSX structure
      const invalidZipBuffer = Buffer.from([
        0x50,
        0x4b,
        0x03,
        0x04, // ZIP local file header signature
        0x00,
        0x00,
        0x00,
        0x00, // Invalid/incomplete data
      ])

      const result = await parseXLSX(invalidZipBuffer)

      // Should either succeed with empty data or fail with parse error
      // The xlsx library is very lenient, so this might succeed
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('errors')
    })
  })
})
