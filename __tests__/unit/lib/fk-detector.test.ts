import { describe, it, expect } from 'vitest'
import { detectForeignKeys, ForeignKey, FKDetectorOptions } from '@/lib/fk-detector'

describe('Foreign Key Detector', () => {
  describe('Basic Pattern Detection', () => {
    it('should detect columns with *_id suffix', () => {
      const headers = ['person_id', 'name', 'age']
      const result = detectForeignKeys(headers)

      expect(result).toHaveLength(1)
      expect(result[0].columnName).toBe('person_id')
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('should detect columns with *_iban suffix', () => {
      const headers = ['account_iban', 'balance', 'currency']
      const result = detectForeignKeys(headers)

      expect(result).toHaveLength(1)
      expect(result[0].columnName).toBe('account_iban')
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('should detect bank_id as a foreign key', () => {
      const headers = ['account_id', 'bank_id', 'iban']
      const result = detectForeignKeys(headers)

      const bankIdFK = result.find((fk) => fk.columnName === 'bank_id')
      expect(bankIdFK).toBeDefined()
      expect(bankIdFK!.confidence).toBeGreaterThanOrEqual(0.9)
      expect(bankIdFK!.targetEntity).toBe('Bank')
    })

    it('should detect from_iban and to_iban as foreign key pairs', () => {
      const headers = ['transaction_id', 'from_iban', 'to_iban', 'amount']
      const result = detectForeignKeys(headers)

      // Note: transaction_id is also detected as an FK
      expect(result.length).toBeGreaterThanOrEqual(2)

      const fromIban = result.find((fk) => fk.columnName === 'from_iban')
      const toIban = result.find((fk) => fk.columnName === 'to_iban')

      expect(fromIban).toBeDefined()
      expect(toIban).toBeDefined()
      expect(fromIban!.targetEntity).toBe('BankAccount')
      expect(toIban!.targetEntity).toBe('BankAccount')
    })
  })

  describe('Confidence Scoring', () => {
    it('should assign HIGH confidence to exact FK patterns', () => {
      const headers = ['person_id', 'company_id', 'bank_id']
      const result = detectForeignKeys(headers)

      result.forEach((fk) => {
        expect(fk.confidence).toBeGreaterThanOrEqual(0.9)
        expect(fk.confidence).toBeLessThanOrEqual(1.0)
      })
    })

    it('should assign MEDIUM confidence to camelCase FK patterns', () => {
      const headers = ['personId', 'companyId']
      const result = detectForeignKeys(headers)

      result.forEach((fk) => {
        expect(fk.confidence).toBeGreaterThanOrEqual(0.6)
        expect(fk.confidence).toBeLessThan(0.9)
      })
    })

    it('should assign LOW confidence to weak indicators', () => {
      const headers = ['ref_code', 'reference']
      const result = detectForeignKeys(headers)

      result.forEach((fk) => {
        expect(fk.confidence).toBeGreaterThanOrEqual(0.3)
        expect(fk.confidence).toBeLessThan(0.6)
      })
    })
  })

  describe('Multiple Foreign Keys', () => {
    it('should detect multiple FKs in the same dataset', () => {
      const headers = [
        'transaction_id',
        'person_id',
        'bank_id',
        'from_iban',
        'to_iban',
        'amount',
      ]
      const result = detectForeignKeys(headers)

      expect(result.length).toBeGreaterThanOrEqual(4)

      const columnNames = result.map((fk) => fk.columnName)
      expect(columnNames).toContain('person_id')
      expect(columnNames).toContain('bank_id')
      expect(columnNames).toContain('from_iban')
      expect(columnNames).toContain('to_iban')
    })
  })

  describe('No Foreign Keys Detected', () => {
    it('should return empty array when no FKs are present', () => {
      const headers = ['name', 'age', 'city', 'email']
      const result = detectForeignKeys(headers)

      expect(result).toEqual([])
    })

    it('should return empty array for empty input', () => {
      const headers: string[] = []
      const result = detectForeignKeys(headers)

      expect(result).toEqual([])
    })
  })

  describe('Case Insensitivity', () => {
    it('should detect FKs regardless of case', () => {
      const headers = ['PERSON_ID', 'Bank_Id', 'company_ID']
      const result = detectForeignKeys(headers)

      expect(result).toHaveLength(3)

      const personFK = result.find((fk) => fk.columnName === 'PERSON_ID')
      const bankFK = result.find((fk) => fk.columnName === 'Bank_Id')
      const companyFK = result.find((fk) => fk.columnName === 'company_ID')

      expect(personFK).toBeDefined()
      expect(bankFK).toBeDefined()
      expect(companyFK).toBeDefined()
    })
  })

  describe('Naming Conventions', () => {
    it('should handle snake_case column names', () => {
      const headers = ['person_id', 'bank_account_id', 'from_iban']
      const result = detectForeignKeys(headers)

      expect(result).toHaveLength(3)
      expect(result[0].columnName).toBe('person_id')
    })

    it('should handle camelCase column names', () => {
      const headers = ['personId', 'bankAccountId', 'fromIban']
      const result = detectForeignKeys(headers)

      expect(result).toHaveLength(3)

      const personId = result.find((fk) => fk.columnName === 'personId')
      expect(personId).toBeDefined()
      expect(personId!.confidence).toBeGreaterThan(0)
    })

    it('should handle mixed naming conventions', () => {
      const headers = ['person_id', 'bankId', 'FROM_IBAN']
      const result = detectForeignKeys(headers)

      expect(result).toHaveLength(3)
    })
  })

  describe('Composite and Special Keys', () => {
    it('should detect potential composite key components', () => {
      const headers = ['country_code', 'bank_id', 'account_number']
      const result = detectForeignKeys(headers)

      const bankId = result.find((fk) => fk.columnName === 'bank_id')
      expect(bankId).toBeDefined()
    })

    it('should detect self-referencing keys', () => {
      const headers = ['person_id', 'parent_id', 'name']
      const result = detectForeignKeys(headers)

      const parentId = result.find((fk) => fk.columnName === 'parent_id')
      expect(parentId).toBeDefined()
      expect(parentId!.targetEntity).toBe('Person')
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should handle columns with null/undefined in name', () => {
      const headers = ['person_id', '', 'bank_id']
      const result = detectForeignKeys(headers)

      // Should only detect valid column names
      expect(result.every((fk) => fk.columnName.length > 0)).toBe(true)
    })

    it('should not treat primary keys as foreign keys', () => {
      const headers = ['id', 'name', 'age']
      const result = detectForeignKeys(headers)

      // Generic 'id' should either have LOW confidence or not be detected
      const genericId = result.find((fk) => fk.columnName === 'id')
      if (genericId) {
        expect(genericId.confidence).toBeLessThan(0.6)
      }
    })

    it('should handle very long column names', () => {
      const headers = [
        'person_id',
        'extremely_long_column_name_that_references_another_table_id',
        'bank_id',
      ]
      const result = detectForeignKeys(headers)

      // Should still detect the valid FK patterns
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Custom Pattern Support', () => {
    it('should support custom regex patterns', () => {
      const headers = ['user_ref', 'product_ref', 'name']
      const options: FKDetectorOptions = {
        customPatterns: [
          { pattern: /.*_ref$/, confidence: 0.8, targetEntity: 'Custom' },
        ],
      }
      const result = detectForeignKeys(headers, options)

      const userRef = result.find((fk) => fk.columnName === 'user_ref')
      const productRef = result.find((fk) => fk.columnName === 'product_ref')

      expect(userRef).toBeDefined()
      expect(productRef).toBeDefined()
    })

    it('should combine custom patterns with built-in patterns', () => {
      const headers = ['person_id', 'user_ref']
      const options: FKDetectorOptions = {
        customPatterns: [
          { pattern: /.*_ref$/, confidence: 0.7, targetEntity: 'Custom' },
        ],
      }
      const result = detectForeignKeys(headers, options)

      expect(result).toHaveLength(2)

      const personId = result.find((fk) => fk.columnName === 'person_id')
      const userRef = result.find((fk) => fk.columnName === 'user_ref')

      expect(personId).toBeDefined()
      expect(userRef).toBeDefined()
    })
  })

  describe('FK Statistics and Metadata', () => {
    it('should include target entity information', () => {
      const headers = ['person_id', 'bank_id', 'company_id']
      const result = detectForeignKeys(headers)

      const personId = result.find((fk) => fk.columnName === 'person_id')
      const bankId = result.find((fk) => fk.columnName === 'bank_id')
      const companyId = result.find((fk) => fk.columnName === 'company_id')

      expect(personId!.targetEntity).toBe('Person')
      expect(bankId!.targetEntity).toBe('Bank')
      expect(companyId!.targetEntity).toBe('Company')
    })

    it('should include pattern type metadata', () => {
      const headers = ['person_id', 'from_iban', 'ref_code']
      const result = detectForeignKeys(headers)

      result.forEach((fk) => {
        expect(fk).toHaveProperty('patternType')
        expect(typeof fk.patternType).toBe('string')
      })
    })

    it('should sort results by confidence descending', () => {
      const headers = ['person_id', 'personId', 'ref_code']
      const result = detectForeignKeys(headers)

      // Verify results are sorted by confidence (highest first)
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].confidence).toBeGreaterThanOrEqual(result[i + 1].confidence)
      }
    })
  })

  describe('Options and Filtering', () => {
    it('should filter by minimum confidence threshold', () => {
      const headers = ['person_id', 'ref_code', 'reference']
      const options: FKDetectorOptions = {
        minConfidence: 0.7,
      }
      const result = detectForeignKeys(headers, options)

      // person_id should be included (0.95 confidence)
      // ref_code and reference should be excluded (0.50 confidence)
      expect(result.length).toBe(1)
      expect(result[0].columnName).toBe('person_id')
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.7)
    })

    it('should handle column matching multiple patterns by using highest confidence', () => {
      // A column like "person_id" could match both domain_specific (0.95) and generic *_id (0.90)
      // The detector should use the highest confidence match
      const headers = ['person_id']
      const result = detectForeignKeys(headers)

      const personFK = result.find((fk) => fk.columnName === 'person_id')
      expect(personFK).toBeDefined()
      // Should use domain_specific pattern with 0.95 confidence, not generic with 0.90
      expect(personFK!.confidence).toBe(0.95)
      expect(personFK!.patternType).toBe('domain_specific')
    })

    it('should extract entity names from compound snake_case column names', () => {
      const headers = ['bank_account_id', 'user_profile_id']
      const result = detectForeignKeys(headers)

      const bankAccountId = result.find((fk) => fk.columnName === 'bank_account_id')
      const userProfileId = result.find((fk) => fk.columnName === 'user_profile_id')

      expect(bankAccountId).toBeDefined()
      expect(userProfileId).toBeDefined()

      // Entities should be converted to PascalCase
      expect(bankAccountId!.targetEntity).toBe('BankAccount')
      expect(userProfileId!.targetEntity).toBe('UserProfile')
    })
  })
})
