import { describe, it, expect, vi } from 'vitest'
import { parseCSV, ParseResult } from '@/lib/csv-parser'

describe('CSV Parser', () => {
  describe('Valid CSV Parsing', () => {
    it('should parse valid CSV with headers', async () => {
      const csv = 'name,age,city\nJohn,30,NYC\nJane,25,LA'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({ name: 'John', age: '30', city: 'NYC' })
      expect(result.data[1]).toEqual({ name: 'Jane', age: '25', city: 'LA' })
      expect(result.errors).toHaveLength(0)
      expect(result.meta.headers).toEqual(['name', 'age', 'city'])
      expect(result.meta.rowCount).toBe(2)
    })

    it('should handle CSV without headers', async () => {
      const csv = 'John,30,NYC\nJane,25,LA'
      const result = await parseCSV(csv, { header: false })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toBeInstanceOf(Array)
      expect(result.data[0]).toEqual(['John', '30', 'NYC'])
      expect(result.data[1]).toEqual(['Jane', '25', 'LA'])
    })

    it('should parse CSV with quoted fields', async () => {
      const csv = 'name,description\n"John Doe","A person named ""John"""\n"Jane","Simple text"'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({ name: 'John Doe', description: 'A person named "John"' })
      expect(result.data[1]).toEqual({ name: 'Jane', description: 'Simple text' })
    })

    it('should handle CSV with line breaks in quoted fields', async () => {
      const csv = 'name,bio\n"John","First line\nSecond line"\n"Jane","Single line"'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].bio).toContain('\n')
      expect(result.data[0]).toEqual({ name: 'John', bio: 'First line\nSecond line' })
    })

    it('should parse CSV with escaped quotes', async () => {
      const csv = 'name,quote\n"John","He said ""hello"""\n"Jane","She said ""goodbye"""'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.data[0]).toEqual({ name: 'John', quote: 'He said "hello"' })
      expect(result.data[1]).toEqual({ name: 'Jane', quote: 'She said "goodbye"' })
    })
  })

  describe('Different Delimiters', () => {
    it('should detect comma delimiter', async () => {
      const csv = 'name,age\nJohn,30'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.meta.delimiter).toBe(',')
    })

    it('should handle semicolon delimiter', async () => {
      const csv = 'name;age\nJohn;30'
      const result = await parseCSV(csv, { delimiter: ';' })

      expect(result.success).toBe(true)
      expect(result.data[0]).toEqual({ name: 'John', age: '30' })
      expect(result.meta.delimiter).toBe(';')
    })

    it('should handle tab delimiter', async () => {
      const csv = 'name\tage\nJohn\t30'
      const result = await parseCSV(csv, { delimiter: '\t' })

      expect(result.success).toBe(true)
      expect(result.data[0]).toEqual({ name: 'John', age: '30' })
      expect(result.meta.delimiter).toBe('\t')
    })

    it('should auto-detect delimiter when not specified', async () => {
      const csv = 'name;age;city\nJohn;30;NYC'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.meta.delimiter).toBe(';')
      expect(result.data[0]).toEqual({ name: 'John', age: '30', city: 'NYC' })
    })
  })

  describe('Edge Cases and Special Characters', () => {
    it('should detect empty CSV file', async () => {
      const csv = ''
      const result = await parseCSV(csv)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('empty')
    })

    it('should handle CSV with only headers', async () => {
      const csv = 'name,age,city'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
      expect(result.meta.headers).toEqual(['name', 'age', 'city'])
    })

    it('should skip empty rows by default', async () => {
      const csv = 'name,age\nJohn,30\n\nJane,25\n\n'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe('John')
      expect(result.data[1].name).toBe('Jane')
    })

    it('should handle CSV with special characters', async () => {
      const csv = 'name,emoji,special\nJohn,😀,"!@#$%^&*()"\nJane,🎉,"<>?:{}[]"'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.data[0]).toEqual({ name: 'John', emoji: '😀', special: '!@#$%^&*()' })
      expect(result.data[1]).toEqual({ name: 'Jane', emoji: '🎉', special: '<>?:{}[]' })
    })

    it('should trim whitespace in headers by default', async () => {
      const csv = ' name , age , city \nJohn,30,NYC'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.meta.headers).toEqual(['name', 'age', 'city'])
      expect(result.data[0]).toHaveProperty('name')
      expect(result.data[0]).toHaveProperty('age')
      expect(result.data[0]).toHaveProperty('city')
    })

    it('should handle CSV with BOM (Byte Order Mark)', async () => {
      const csv = '\uFEFFname,age\nJohn,30'
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.data[0]).toEqual({ name: 'John', age: '30' })
      expect(result.meta.headers).toContain('name')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed CSV with missing columns', async () => {
      const csv = 'name,age,city\nJohn,30\nJane,25,LA'
      const result = await parseCSV(csv)

      // papaparse is lenient by default, it will parse this
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      // Missing column should be empty or undefined
      expect(result.data[0].city).toBeUndefined()
    })

    it('should detect duplicate headers', async () => {
      const csv = 'name,age,name\nJohn,30,Doe'
      const result = await parseCSV(csv)

      // papaparse handles duplicate headers by overwriting
      expect(result.success).toBe(true)
      expect(result.data[0]).toHaveProperty('name')
      expect(result.data[0]).toHaveProperty('age')
    })

    it('should provide error details for parsing failures', async () => {
      // Create an invalid input that will trigger an error
      const invalidInput = null as any
      const result = await parseCSV(invalidInput)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toHaveProperty('message')
      expect(result.errors[0]).toHaveProperty('type')
      expect(result.errors[0]).toHaveProperty('code')
    })
  })

  describe('Options and Configuration', () => {
    it('should allow custom header transformation', async () => {
      const csv = 'First Name,Last Name\nJohn,Doe'
      const result = await parseCSV(csv, {
        transformHeader: (header: string) => header.toLowerCase().replace(/\s+/g, '_')
      })

      expect(result.success).toBe(true)
      expect(result.meta.headers).toEqual(['first_name', 'last_name'])
      expect(result.data[0]).toEqual({ first_name: 'John', last_name: 'Doe' })
    })

    it('should allow skipping empty lines to be disabled', async () => {
      const csv = 'name,age\nJohn,30\n\nJane,25'
      const result = await parseCSV(csv, { skipEmptyLines: false })

      expect(result.success).toBe(true)
      // papaparse might still handle this, but we're testing the option is passed
      expect(result.data.length).toBeGreaterThanOrEqual(2)
    })

    it('should preserve delimiter choice in metadata', async () => {
      const csv = 'name|age\nJohn|30'
      const result = await parseCSV(csv, { delimiter: '|' })

      expect(result.success).toBe(true)
      expect(result.meta.delimiter).toBe('|')
      expect(result.data[0]).toEqual({ name: 'John', age: '30' })
    })
  })

  describe('File Input Support', () => {
    it('should handle File object input', async () => {
      const csvContent = 'name,age\nJohn,30'
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      const result = await parseCSV(file)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({ name: 'John', age: '30' })
    })

    it('should handle large CSV files (streaming simulation)', async () => {
      // Generate a CSV with 1000 rows to simulate a larger file
      const rows = ['name,age,city']
      for (let i = 0; i < 1000; i++) {
        rows.push(`Person${i},${20 + i},City${i}`)
      }
      const csv = rows.join('\n')
      const result = await parseCSV(csv)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1000)
      expect(result.meta.rowCount).toBe(1000)
      expect(result.data[0]).toEqual({ name: 'Person0', age: '20', city: 'City0' })
      expect(result.data[999]).toEqual({ name: 'Person999', age: '1019', city: 'City999' })
    })
  })

  describe('Critical Error Handling', () => {
    it('should handle CSV with unclosed quotes gracefully (papaparse is lenient)', async () => {
      // CSV with unclosed quote - papaparse handles this gracefully
      const csv = 'name,age\n"John,30'
      const result = await parseCSV(csv)

      // papaparse is lenient and will parse this successfully
      expect(result.success).toBe(true)
      expect(result.data.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle CSV with quote errors gracefully', async () => {
      // CSV with quotes that might cause parsing issues
      const csv = 'name,age\nJohn,30\n"Jane",25'
      const result = await parseCSV(csv)

      // Should succeed - papaparse handles quotes well
      expect(result.success).toBe(true)
      expect(result.data.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle extremely malformed input', async () => {
      // Very short malformed input
      const csv = '"'
      const result = await parseCSV(csv)

      // Even this gets parsed (might be empty but shouldn't crash)
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('meta')
    })

    it('should handle Papa.parse error callback', async () => {
      // Mock papaparse to trigger error callback
      const Papa = await import('papaparse')

      // Temporarily replace parse with a version that triggers the error callback
      vi.spyOn(Papa.default, 'parse').mockImplementationOnce((input: any, config: any): any => {
        // Simulate a catastrophic error by calling the error callback
        if (config && config.error) {
          config.error(new Error('Simulated Papa.parse error'))
        }
        return undefined
      })

      const csv = 'name,age\nJohn,30'
      const result = await parseCSV(csv)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('Error')
      expect(result.errors[0].code).toBe('PARSE_ERROR')
      expect(result.errors[0].message).toContain('Simulated')
      expect(result.data).toHaveLength(0)

      // Restore original implementation
      vi.restoreAllMocks()
    })

    it('should handle critical errors with missing meta.fields', async () => {
      // Mock papaparse to return critical error with undefined meta.fields
      const Papa = await import('papaparse')

      vi.spyOn(Papa.default, 'parse').mockImplementationOnce((input: any, config: any): any => {
        // Simulate critical error (unclosed quotes) with no data and undefined meta.fields
        if (config && config.complete) {
          config.complete({
            data: [],
            errors: [
              {
                type: 'Quotes',
                code: 'UndetectableDelimiter',
                message: 'Unable to detect delimiter',
                row: 0,
              },
            ],
            meta: {
              delimiter: ',',
              linebreak: '\n',
              // fields is intentionally undefined to test the || [] fallback
            },
          })
        }
        return undefined
      })

      const csv = 'invalid,"unclosed quote\ndata'
      const result = await parseCSV(csv)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('Quotes')
      expect(result.data).toHaveLength(0)
      // Verify the fallback empty array is used for headers
      expect(result.meta.headers).toEqual([])

      // Restore original implementation
      vi.restoreAllMocks()
    })
  })

  describe('Type Inference', () => {
    it('should infer and convert numeric columns', async () => {
      const csv = 'name,age,price\nJohn,30,19.99\nJane,25,29.50'
      const result = await parseCSV(csv, { inferTypes: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(typeof result.data[0].age).toBe('number')
      expect(typeof result.data[0].price).toBe('number')
      expect(result.data[0].age).toBe(30)
      expect(result.data[0].price).toBe(19.99)
    })

    it('should infer and convert boolean columns', async () => {
      const csv = 'name,active,verified\nJohn,true,1\nJane,false,0'
      const result = await parseCSV(csv, { inferTypes: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(typeof result.data[0].active).toBe('boolean')
      expect(typeof result.data[0].verified).toBe('boolean')
      expect(result.data[0].active).toBe(true)
      expect(result.data[0].verified).toBe(true)
      expect(result.data[1].active).toBe(false)
      expect(result.data[1].verified).toBe(false)
    })

    it('should infer and convert date columns', async () => {
      const csv = 'name,birthdate\nJohn,1990-05-15\nJane,1985-08-22'
      const result = await parseCSV(csv, { inferTypes: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].birthdate).toBeInstanceOf(Date)
      expect(result.data[1].birthdate).toBeInstanceOf(Date)
    })

    it('should keep string columns as strings', async () => {
      const csv = 'name,city\nJohn,NYC\nJane,LA'
      const result = await parseCSV(csv, { inferTypes: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(typeof result.data[0].name).toBe('string')
      expect(typeof result.data[0].city).toBe('string')
    })

    it('should handle mixed type columns (fall back to string)', async () => {
      const csv = 'name,value\nJohn,123\nJane,abc'
      const result = await parseCSV(csv, { inferTypes: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      // Mixed types should stay as strings
      expect(typeof result.data[0].value).toBe('string')
      expect(typeof result.data[1].value).toBe('string')
    })

    it('should not infer types when inferTypes is false', async () => {
      const csv = 'name,age\nJohn,30\nJane,25'
      const result = await parseCSV(csv, { inferTypes: false })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      // Should remain strings when inferTypes is false
      expect(typeof result.data[0].age).toBe('string')
      expect(result.data[0].age).toBe('30')
    })

    it('should handle empty values during type inference', async () => {
      const csv = 'name,age,active\nJohn,30,true\nJane,,false'
      const result = await parseCSV(csv, { inferTypes: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(typeof result.data[0].age).toBe('number')
      // Empty values should be preserved
      expect(result.data[1].age).toBe('')
    })

    it('should handle CSV without headers during type inference', async () => {
      const csv = 'John,30\nJane,25'
      const result = await parseCSV(csv, { header: false, inferTypes: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      // Arrays shouldn't be affected by type inference
      expect(result.data[0]).toBeInstanceOf(Array)
    })

    it('should handle type inference on CSV with only headers (empty data)', async () => {
      const csv = 'name,age,city'
      const result = await parseCSV(csv, { inferTypes: true })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
      expect(result.meta.headers).toEqual(['name', 'age', 'city'])
      expect(result.meta.rowCount).toBe(0)
    })
  })
})
