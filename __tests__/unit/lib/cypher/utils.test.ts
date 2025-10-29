import { describe, it, expect } from 'vitest'
import {
  UNIQUE_IDENTIFIERS,
  filterUndefinedValues,
  getUniqueIdentifierField,
  validateNeo4jIdentifier,
} from '@/lib/cypher/utils'

describe('Cypher Query Utilities', () => {
  describe('UNIQUE_IDENTIFIERS', () => {
    it('should contain all required entity type mappings', () => {
      expect(UNIQUE_IDENTIFIERS).toHaveProperty('Person', 'person_id')
      expect(UNIQUE_IDENTIFIERS).toHaveProperty('BankAccount', 'iban')
      expect(UNIQUE_IDENTIFIERS).toHaveProperty('Bank', 'bank_id')
      expect(UNIQUE_IDENTIFIERS).toHaveProperty('Company', 'company_id')
      expect(UNIQUE_IDENTIFIERS).toHaveProperty('Transaction', 'transaction_id')
    })

    it('should be immutable by convention', () => {
      const keys = Object.keys(UNIQUE_IDENTIFIERS)
      expect(keys.length).toBe(5)
    })
  })

  describe('filterUndefinedValues', () => {
    it('should remove undefined values', () => {
      const input = {
        a: 1,
        b: undefined,
        c: 'test',
      }

      const result = filterUndefinedValues(input)

      expect(result).toEqual({ a: 1, c: 'test' })
      expect(result).not.toHaveProperty('b')
    })

    it('should preserve null values', () => {
      const input = {
        a: 1,
        b: null,
        c: undefined,
      }

      const result = filterUndefinedValues(input)

      expect(result).toEqual({ a: 1, b: null })
      expect(result).toHaveProperty('b', null)
    })

    it('should preserve false values', () => {
      const input = {
        a: false,
        b: 0,
        c: '',
      }

      const result = filterUndefinedValues(input)

      expect(result).toEqual({ a: false, b: 0, c: '' })
    })

    it('should handle empty object', () => {
      const result = filterUndefinedValues({})

      expect(result).toEqual({})
    })

    it('should handle all undefined values', () => {
      const input = {
        a: undefined,
        b: undefined,
        c: undefined,
      }

      const result = filterUndefinedValues(input)

      expect(result).toEqual({})
    })

    it('should preserve property order', () => {
      const input = {
        z_field: 'last',
        a_field: 'first',
        m_field: 'middle',
        undefined_field: undefined,
      }

      const result = filterUndefinedValues(input)

      const keys = Object.keys(result)
      expect(keys).toEqual(['z_field', 'a_field', 'm_field'])
    })

    it('should handle complex values', () => {
      const input = {
        object: { nested: 'value' },
        array: [1, 2, 3],
        date: new Date('2024-01-01'),
        undefined_val: undefined,
      }

      const result = filterUndefinedValues(input)

      expect(result).toHaveProperty('object')
      expect(result).toHaveProperty('array')
      expect(result).toHaveProperty('date')
      expect(result).not.toHaveProperty('undefined_val')
    })
  })

  describe('getUniqueIdentifierField', () => {
    it('should return correct identifier for Person', () => {
      expect(getUniqueIdentifierField('Person')).toBe('person_id')
    })

    it('should return correct identifier for BankAccount', () => {
      expect(getUniqueIdentifierField('BankAccount')).toBe('iban')
    })

    it('should return correct identifier for Bank', () => {
      expect(getUniqueIdentifierField('Bank')).toBe('bank_id')
    })

    it('should return correct identifier for Company', () => {
      expect(getUniqueIdentifierField('Company')).toBe('company_id')
    })

    it('should return correct identifier for Transaction', () => {
      expect(getUniqueIdentifierField('Transaction')).toBe('transaction_id')
    })

    it('should throw error for unknown entity type', () => {
      expect(() => {
        getUniqueIdentifierField('UnknownEntity')
      }).toThrow(/unknown entity type.*UnknownEntity/i)
    })

    it('should include list of supported types in error message', () => {
      expect(() => {
        getUniqueIdentifierField('UnknownEntity')
      }).toThrow(/Person, BankAccount, Bank, Company, Transaction/)
    })

    it('should throw error for empty string', () => {
      expect(() => {
        getUniqueIdentifierField('')
      }).toThrow(/unknown entity type/i)
    })
  })

  describe('validateNeo4jIdentifier', () => {
    describe('Valid identifiers', () => {
      it('should accept valid label', () => {
        expect(() => {
          validateNeo4jIdentifier('Person', 'label')
        }).not.toThrow()
      })

      it('should accept valid relationship type', () => {
        expect(() => {
          validateNeo4jIdentifier('OWNS', 'relationship type')
        }).not.toThrow()
      })

      it('should accept label starting with underscore', () => {
        expect(() => {
          validateNeo4jIdentifier('_Private', 'label')
        }).not.toThrow()
      })

      it('should accept label with numbers', () => {
        expect(() => {
          validateNeo4jIdentifier('Account2024', 'label')
        }).not.toThrow()
      })

      it('should accept label with underscores', () => {
        expect(() => {
          validateNeo4jIdentifier('Bank_Account', 'label')
        }).not.toThrow()
      })
    })

    describe('Invalid identifiers', () => {
      it('should reject empty string for label', () => {
        expect(() => {
          validateNeo4jIdentifier('', 'label')
        }).toThrow(/invalid.*label/i)
      })

      it('should reject empty string for relationship type', () => {
        expect(() => {
          validateNeo4jIdentifier('', 'relationship type')
        }).toThrow(/invalid.*relationship type/i)
      })

      it('should reject label starting with number', () => {
        expect(() => {
          validateNeo4jIdentifier('123Person', 'label')
        }).toThrow(/invalid.*label/i)
      })

      it('should reject label with Cypher injection attempt', () => {
        expect(() => {
          validateNeo4jIdentifier('Person; DROP DATABASE', 'label')
        }).toThrow(/invalid.*label/i)
      })

      it('should reject relationship type with special characters', () => {
        expect(() => {
          validateNeo4jIdentifier('OWNS{admin:true}', 'relationship type')
        }).toThrow(/invalid.*relationship type/i)
      })

      it('should reject label with spaces', () => {
        expect(() => {
          validateNeo4jIdentifier('Bank Account', 'label')
        }).toThrow(/invalid.*label/i)
      })

      it('should reject label with hyphens', () => {
        expect(() => {
          validateNeo4jIdentifier('Bank-Account', 'label')
        }).toThrow(/invalid.*label/i)
      })

      it('should reject label with dots', () => {
        expect(() => {
          validateNeo4jIdentifier('Bank.Account', 'label')
        }).toThrow(/invalid.*label/i)
      })

      it('should include correct identifier type in error message for label', () => {
        expect(() => {
          validateNeo4jIdentifier('123Invalid', 'label')
        }).toThrow(/Labels must start/)
      })

      it('should include correct identifier type in error message for relationship type', () => {
        expect(() => {
          validateNeo4jIdentifier('123INVALID', 'relationship type')
        }).toThrow(/Relationship types must start/)
      })
    })

    describe('Edge cases', () => {
      it('should handle single character valid label', () => {
        expect(() => {
          validateNeo4jIdentifier('A', 'label')
        }).not.toThrow()
      })

      it('should handle single underscore', () => {
        expect(() => {
          validateNeo4jIdentifier('_', 'label')
        }).not.toThrow()
      })

      it('should handle very long valid identifier', () => {
        const longIdentifier = 'A' + 'a'.repeat(1000)
        expect(() => {
          validateNeo4jIdentifier(longIdentifier, 'label')
        }).not.toThrow()
      })
    })
  })
})
