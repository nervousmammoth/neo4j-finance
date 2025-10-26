import { describe, it, expect } from 'vitest'
import { buildErrorResponse, buildSuccessResponse, inferColumnTypes } from '@/lib/parser-utils'

describe('parser-utils', () => {
  describe('buildErrorResponse', () => {
    it('should build error response with default empty delimiter/linebreak', () => {
      const result = buildErrorResponse([
        {
          type: 'Error',
          code: 'INVALID_INPUT',
          message: 'Test error',
        },
      ])

      expect(result).toEqual({
        success: false,
        data: [],
        errors: [
          {
            type: 'Error',
            code: 'INVALID_INPUT',
            message: 'Test error',
          },
        ],
        meta: {
          delimiter: '',
          linebreak: '',
          headers: [],
          rowCount: 0,
        },
      })
    })

    it('should build error response with custom defaults for delimiter/linebreak', () => {
      const result = buildErrorResponse(
        [
          {
            type: 'Error',
            code: 'PARSE_ERROR',
            message: 'Parse failed',
          },
        ],
        {},
        { delimiter: 'N/A', linebreak: 'N/A' }
      )

      expect(result.meta.delimiter).toBe('N/A')
      expect(result.meta.linebreak).toBe('N/A')
    })

    it('should use provided meta values over defaults', () => {
      const result = buildErrorResponse(
        [
          {
            type: 'Error',
            code: 'TEST',
            message: 'Test',
          },
        ],
        {
          delimiter: ',',
          linebreak: '\n',
          headers: ['col1', 'col2'],
          rowCount: 5,
        },
        { delimiter: 'N/A', linebreak: 'N/A' }
      )

      expect(result.meta).toEqual({
        delimiter: ',',
        linebreak: '\n',
        headers: ['col1', 'col2'],
        rowCount: 5,
      })
    })

    it('should handle multiple errors', () => {
      const errors = [
        { type: 'Error', code: 'ERR1', message: 'First error' },
        { type: 'Warning', code: 'WARN1', message: 'First warning' },
      ]

      const result = buildErrorResponse(errors)

      expect(result.errors).toHaveLength(2)
      expect(result.errors).toEqual(errors)
    })

    it('should use defaults when partial meta is provided', () => {
      const result = buildErrorResponse(
        [{ type: 'Error', code: 'TEST', message: 'Test' }],
        { headers: ['col1'] }, // Only headers provided
        { delimiter: 'N/A', linebreak: 'N/A' }
      )

      expect(result.meta).toEqual({
        delimiter: 'N/A',
        linebreak: 'N/A',
        headers: ['col1'],
        rowCount: 0,
      })
    })
  })

  describe('buildSuccessResponse', () => {
    it('should build success response with data and meta', () => {
      const data = [{ name: 'Alice', age: '30' }]
      const meta = {
        delimiter: ',',
        linebreak: '\n',
        headers: ['name', 'age'],
        rowCount: 1,
      }

      const result = buildSuccessResponse(data, [], meta)

      expect(result).toEqual({
        success: true,
        data,
        errors: [],
        meta,
      })
    })

    it('should include non-critical errors as warnings', () => {
      const data = [{ col1: 'value1' }]
      const warnings = [
        { type: 'Warning', code: 'FIELD_MISMATCH', message: 'Too many fields' },
      ]
      const meta = {
        delimiter: ',',
        linebreak: '\n',
        headers: ['col1'],
        rowCount: 1,
      }

      const result = buildSuccessResponse(data, warnings, meta)

      expect(result.success).toBe(true)
      expect(result.errors).toEqual(warnings)
    })

    it('should handle empty data array', () => {
      const meta = {
        delimiter: ',',
        linebreak: '\n',
        headers: ['col1', 'col2'],
        rowCount: 0,
      }

      const result = buildSuccessResponse([], [], meta)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      expect(result.meta.rowCount).toBe(0)
    })

    it('should preserve all metadata fields', () => {
      const data = [{ a: '1' }, { a: '2' }]
      const meta = {
        delimiter: '\t',
        linebreak: '\r\n',
        headers: ['a'],
        rowCount: 2,
      }

      const result = buildSuccessResponse(data, [], meta)

      expect(result.meta.delimiter).toBe('\t')
      expect(result.meta.linebreak).toBe('\r\n')
      expect(result.meta.headers).toEqual(['a'])
      expect(result.meta.rowCount).toBe(2)
    })
  })

  describe('inferColumnTypes', () => {
    it('should return empty array for empty input', () => {
      const result = inferColumnTypes([])
      expect(result).toEqual([])
    })

    it('should return original data for non-object input', () => {
      const invalidData = null as unknown as Record<string, string | number>
      const result = inferColumnTypes([invalidData])
      expect(result).toEqual([invalidData])
    })

    it('should return original data for array input', () => {
      const arrayData = [] as unknown as Record<string, string | number>
      const result = inferColumnTypes([arrayData])
      expect(result).toEqual([arrayData])
    })

    it('should infer number types correctly', () => {
      const data = [
        { age: '30', count: '100' },
        { age: '25', count: '50' },
      ]

      const result = inferColumnTypes(data)

      expect(result).toEqual([
        { age: 30, count: 100 },
        { age: 25, count: 50 },
      ])
    })

    it('should infer boolean types correctly', () => {
      const data = [
        { active: 'true', enabled: 'yes', flag: '1' },
        { active: 'false', enabled: 'no', flag: '0' },
      ]

      const result = inferColumnTypes(data)

      expect(result).toEqual([
        { active: true, enabled: true, flag: true },
        { active: false, enabled: false, flag: false },
      ])
    })

    it('should handle case-insensitive boolean values', () => {
      const data = [
        { active: 'TRUE', enabled: 'Yes' },
        { active: 'FALSE', enabled: 'NO' },
      ]

      const result = inferColumnTypes(data)

      expect(result[0].active).toBe(true)
      expect(result[0].enabled).toBe(true)
      expect(result[1].active).toBe(false)
      expect(result[1].enabled).toBe(false)
    })

    it('should infer date types correctly', () => {
      const data = [
        { created: '2024-01-01', updated: '2024-12-31T23:59:59Z' },
        { created: '2024-06-15', updated: '2024-07-01T12:00:00Z' },
      ]

      const result = inferColumnTypes(data)

      expect(result[0].created).toBeInstanceOf(Date)
      expect(result[0].updated).toBeInstanceOf(Date)
      expect((result[0].created as Date).getFullYear()).toBe(2024)
    })

    it('should not infer plain numeric strings as dates', () => {
      const data = [{ value: '123' }, { value: '456' }]

      const result = inferColumnTypes(data)

      // Should be inferred as number, not date
      expect(typeof result[0].value).toBe('number')
      expect(result[0].value).toBe(123)
    })

    it('should keep strings when type cannot be inferred', () => {
      const data = [
        { name: 'Alice', city: 'NYC' },
        { name: 'Bob', city: 'LA' },
      ]

      const result = inferColumnTypes(data)

      expect(result).toEqual([
        { name: 'Alice', city: 'NYC' },
        { name: 'Bob', city: 'LA' },
      ])
    })

    it('should skip empty values when inferring types', () => {
      const data = [
        { age: '30', name: '' },
        { age: '', name: 'Bob' },
        { age: '25', name: 'Charlie' },
      ]

      const result = inferColumnTypes(data)

      // age should be inferred as number (ignoring empty string)
      expect(typeof result[0].age).toBe('number')
      expect(result[0].age).toBe(30)
      expect(result[0].name).toBe('')
    })

    it('should skip null and undefined values when inferring types', () => {
      const data = [
        { age: '30', status: null },
        { age: undefined, status: 'active' },
        { age: '25', status: 'inactive' },
      ]

      const result = inferColumnTypes(data as Record<string, string | number>[])

      // age should be inferred as number (ignoring null/undefined)
      expect(typeof result[0].age).toBe('number')
      expect(result[0].age).toBe(30)
    })

    it('should handle mixed types and choose most specific', () => {
      const data = [
        { value: '123' },
        { value: '456' },
        { value: '789' },
      ]

      const result = inferColumnTypes(data)

      // All numeric strings should be inferred as numbers
      expect(typeof result[0].value).toBe('number')
    })

    it('should prioritize boolean over number', () => {
      const data = [{ flag: '1' }, { flag: '0' }]

      const result = inferColumnTypes(data)

      // '1' and '0' are valid booleans, should be inferred as boolean not number
      expect(typeof result[0].flag).toBe('boolean')
      expect(result[0].flag).toBe(true)
      expect(result[1].flag).toBe(false)
    })

    it('should handle numeric input values from XLSX', () => {
      const data = [
        { age: 30, count: 100 },
        { age: 25, count: 50 },
      ]

      const result = inferColumnTypes(data)

      // Should convert numbers to numbers (String(30) -> Number('30') = 30)
      expect(typeof result[0].age).toBe('number')
      expect(result[0].age).toBe(30)
    })

    it('should handle mixed string and number inputs', () => {
      const data = [
        { value: '30' },
        { value: 25 },
      ]

      const result = inferColumnTypes(data)

      // Both should be inferred as numbers
      expect(typeof result[0].value).toBe('number')
      expect(typeof result[1].value).toBe('number')
    })

    it('should handle whitespace in numeric strings', () => {
      const data = [{ value: '  123  ' }, { value: '  456  ' }]

      const result = inferColumnTypes(data)

      // Trimmed whitespace should still parse as number
      expect(typeof result[0].value).toBe('number')
      expect(result[0].value).toBe(123)
    })

    it('should not infer empty or whitespace-only strings as numbers', () => {
      const data = [{ value: '   ' }, { value: '' }]

      const result = inferColumnTypes(data)

      // Empty/whitespace strings should remain strings
      expect(typeof result[0].value).toBe('string')
      expect(result[0].value).toBe('   ')
    })

    it('should handle complex type inference scenario', () => {
      const data = [
        { id: '1', name: 'Alice', active: 'true', score: '95.5', date: '2024-01-01' },
        { id: '2', name: 'Bob', active: 'false', score: '87.3', date: '2024-01-02' },
      ]

      const result = inferColumnTypes(data)

      expect(typeof result[0].id).toBe('number')
      expect(typeof result[0].name).toBe('string')
      expect(typeof result[0].active).toBe('boolean')
      expect(typeof result[0].score).toBe('number')
      expect(result[0].date).toBeInstanceOf(Date)
    })
  })
})
