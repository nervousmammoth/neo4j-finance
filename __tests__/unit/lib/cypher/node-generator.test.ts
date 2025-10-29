import { describe, it, expect } from 'vitest'
import { generateNodeQuery } from '@/lib/cypher/node-generator'

describe('Node Cypher Query Generator', () => {
  describe('Person Entity', () => {
    it('should generate CREATE query with parameterized values', () => {
      const data = {
        person_id: 'P123',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        nationality: 'US',
        risk_level: 'low',
      }

      const result = generateNodeQuery('Person', data)

      expect(result.query).toContain('CREATE (n:Person)')
      expect(result.query).toContain('SET n = $props')
      expect(result.params).toHaveProperty('props')
      expect(result.params.props).toEqual(data)
    })

    it('should generate MERGE query with person_id as unique identifier', () => {
      const data = {
        person_id: 'P123',
        first_name: 'John',
        last_name: 'Doe',
      }

      const result = generateNodeQuery('Person', data, { merge: true })

      expect(result.query).toContain('MERGE (n:Person {person_id: $person_id})')
      expect(result.query).toContain('SET n += $props')
      expect(result.params).toHaveProperty('person_id', 'P123')
      expect(result.params).toHaveProperty('props')
    })

    it('should handle NULL values correctly', () => {
      const data = {
        person_id: 'P123',
        first_name: 'John',
        last_name: 'Doe',
        alias: null,
        occupation: undefined,
      }

      const result = generateNodeQuery('Person', data)

      expect(result.params.props).toHaveProperty('person_id', 'P123')
      expect(result.params.props).toHaveProperty('first_name', 'John')
      expect(result.params.props).toHaveProperty('last_name', 'Doe')
      // null values should be included, undefined should be excluded
      expect(result.params.props).toHaveProperty('alias', null)
      expect(result.params.props).not.toHaveProperty('occupation')
    })

    it('should support dataset namespacing', () => {
      const data = {
        person_id: 'P123',
        first_name: 'John',
        last_name: 'Doe',
      }

      const result = generateNodeQuery('Person', data, { datasetId: 'dataset_001' })

      expect(result.params.props).toHaveProperty('dataset_id', 'dataset_001')
      expect(result.params.props).toHaveProperty('person_id', 'P123')
    })
  })

  describe('BankAccount Entity', () => {
    it('should generate CREATE query for bank account', () => {
      const data = {
        account_id: 'ACC123',
        iban: 'DE89370400440532013000',
        bank_id: 'BNK001',
        account_type: 'checking',
        current_balance: 1500.50,
        currency: 'EUR',
        country: 'DE',
      }

      const result = generateNodeQuery('BankAccount', data)

      expect(result.query).toContain('CREATE (n:BankAccount)')
      expect(result.query).toContain('SET n = $props')
      expect(result.params.props).toEqual(data)
    })

    it('should generate MERGE query with IBAN as unique identifier', () => {
      const data = {
        account_id: 'ACC123',
        iban: 'DE89370400440532013000',
        bank_id: 'BNK001',
        current_balance: 1500.50,
      }

      const result = generateNodeQuery('BankAccount', data, { merge: true })

      expect(result.query).toContain('MERGE (n:BankAccount {iban: $iban})')
      expect(result.query).toContain('SET n += $props')
      expect(result.params).toHaveProperty('iban', 'DE89370400440532013000')
    })

    it('should handle optional fields correctly', () => {
      const data = {
        account_id: 'ACC123',
        iban: 'DE89370400440532013000',
        bank_id: 'BNK001',
        account_type: 'checking',
        current_balance: 1500.50,
        currency: 'EUR',
        country: 'DE',
        closed_date: null, // optional, null value
      }

      const result = generateNodeQuery('BankAccount', data)

      expect(result.params.props).toHaveProperty('closed_date', null)
    })

    it('should handle type conversions for numeric values', () => {
      const data = {
        account_id: 'ACC123',
        iban: 'DE89370400440532013000',
        current_balance: '1500.50', // string number
        bank_id: 'BNK001',
      }

      const result = generateNodeQuery('BankAccount', data)

      // Should preserve the original value type (no automatic conversion)
      expect(result.params.props.current_balance).toBe('1500.50')
    })
  })

  describe('Bank Entity', () => {
    it('should generate CREATE query for bank', () => {
      const data = {
        bank_id: 'BNK001',
        name: 'Deutsche Bank',
        country: 'DE',
        routing_number: '123456789',
      }

      const result = generateNodeQuery('Bank', data)

      expect(result.query).toContain('CREATE (n:Bank)')
      expect(result.query).toContain('SET n = $props')
      expect(result.params.props).toEqual(data)
    })

    it('should generate MERGE query with bank_id as unique identifier', () => {
      const data = {
        bank_id: 'BNK001',
        name: 'Deutsche Bank',
        country: 'DE',
      }

      const result = generateNodeQuery('Bank', data, { merge: true })

      expect(result.query).toContain('MERGE (n:Bank {bank_id: $bank_id})')
      expect(result.query).toContain('SET n += $props')
      expect(result.params).toHaveProperty('bank_id', 'BNK001')
    })

    it('should support batch operations placeholder', () => {
      // Placeholder for future batch support
      const data = {
        bank_id: 'BNK001',
        name: 'Deutsche Bank',
        country: 'DE',
      }

      const result = generateNodeQuery('Bank', data)

      // Single node operation for now
      expect(result.query).toContain('CREATE (n:Bank)')
      expect(result.params).toHaveProperty('props')
    })

    it('should throw error for invalid entity label', () => {
      const data = { bank_id: 'BNK001' }

      expect(() => {
        generateNodeQuery('Bank; DROP DATABASE', data)
      }).toThrow(/invalid.*label/i)
    })
  })

  describe('Company Entity', () => {
    it('should generate CREATE query for company', () => {
      const data = {
        company_id: 'COM123',
        registration_number: 'REG456',
        name: 'ACME Corp',
        country: 'US',
        business_type: 'technology',
        is_shell_company: false,
        incorporation_date: '2010-05-15',
        status: 'active',
      }

      const result = generateNodeQuery('Company', data)

      expect(result.query).toContain('CREATE (n:Company)')
      expect(result.params.props).toEqual(data)
    })

    it('should generate MERGE query for company', () => {
      const data = {
        company_id: 'COM123',
        name: 'ACME Corp',
        country: 'US',
      }

      const result = generateNodeQuery('Company', data, { merge: true })

      expect(result.query).toContain('MERGE (n:Company {company_id: $company_id})')
      expect(result.params).toHaveProperty('company_id', 'COM123')
    })

    it('should handle boolean values correctly', () => {
      const data = {
        company_id: 'COM123',
        name: 'ACME Corp',
        is_shell_company: true,
      }

      const result = generateNodeQuery('Company', data)

      expect(result.params.props.is_shell_company).toBe(true)
      expect(typeof result.params.props.is_shell_company).toBe('boolean')
    })

    it('should handle date formatting', () => {
      const data = {
        company_id: 'COM123',
        name: 'ACME Corp',
        incorporation_date: '2010-05-15',
      }

      const result = generateNodeQuery('Company', data)

      // Dates should be preserved as strings for Neo4j Date type
      expect(result.params.props.incorporation_date).toBe('2010-05-15')
      expect(typeof result.params.props.incorporation_date).toBe('string')
    })
  })

  describe('Transaction Entity', () => {
    it('should generate CREATE query for transaction', () => {
      const data = {
        transaction_id: 'TXN123',
        from_iban: 'DE89370400440532013000',
        to_iban: 'FR1420041010050500013M02606',
        amount: 1000.00,
        currency: 'EUR',
        date: '2024-01-15',
        transaction_type: 'transfer',
        is_flagged: false,
      }

      const result = generateNodeQuery('Transaction', data)

      expect(result.query).toContain('CREATE (n:Transaction)')
      expect(result.params.props).toEqual(data)
    })

    it('should handle relationships inline (properties only)', () => {
      const data = {
        transaction_id: 'TXN123',
        from_iban: 'DE89370400440532013000',
        to_iban: 'FR1420041010050500013M02606',
        amount: 1000.00,
      }

      const result = generateNodeQuery('Transaction', data)

      // Node generator only handles node properties, not relationships
      expect(result.params.props).toHaveProperty('from_iban')
      expect(result.params.props).toHaveProperty('to_iban')
    })

    it('should handle timestamp formatting', () => {
      const data = {
        transaction_id: 'TXN123',
        date: '2024-01-15T10:30:00Z',
        amount: 1000.00,
      }

      const result = generateNodeQuery('Transaction', data)

      // Timestamps preserved as strings
      expect(result.params.props.date).toBe('2024-01-15T10:30:00Z')
    })

    it('should handle flagged transactions', () => {
      const data = {
        transaction_id: 'TXN123',
        amount: 50000.00,
        is_flagged: true,
        flag_reason: 'High value transaction',
      }

      const result = generateNodeQuery('Transaction', data)

      expect(result.params.props.is_flagged).toBe(true)
      expect(result.params.props.flag_reason).toBe('High value transaction')
    })
  })

  describe('Security: Cypher Injection Prevention', () => {
    it('should prevent injection via malicious entity labels', () => {
      const data = { id: '123' }

      expect(() => {
        generateNodeQuery('Person; DROP DATABASE; //', data)
      }).toThrow(/invalid.*label/i)
    })

    it('should prevent injection via entity labels with special characters', () => {
      const data = { id: '123' }

      expect(() => {
        generateNodeQuery('Person{admin:true}', data)
      }).toThrow(/invalid.*label/i)
    })

    it('should reject entity labels starting with numbers', () => {
      const data = { id: '123' }

      expect(() => {
        generateNodeQuery('123Person', data)
      }).toThrow(/invalid.*label/i)
    })

    it('should use parameterized queries by default (secure by default)', () => {
      const data = {
        person_id: "P'; DROP ALL; //",
        first_name: 'Malicious',
      }

      const result = generateNodeQuery('Person', data)

      // Query should use parameters, not string interpolation
      expect(result.query).not.toContain("P'; DROP ALL; //")
      expect(result.query).toContain('$props')
      expect(result.params.props.person_id).toBe("P'; DROP ALL; //")
    })

    it('should handle property values with quotes safely', () => {
      const data = {
        person_id: 'P123',
        first_name: "O'Brien",
        last_name: 'Smith-Jones',
      }

      const result = generateNodeQuery('Person', data)

      // Parameterized queries handle special characters safely
      expect(result.params.props.first_name).toBe("O'Brien")
      expect(result.params.props.last_name).toBe('Smith-Jones')
    })

    it('should handle backslash characters safely', () => {
      const data = {
        person_id: 'P123',
        first_name: 'Test\\User',
      }

      const result = generateNodeQuery('Person', data)

      expect(result.params.props.first_name).toBe('Test\\User')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should throw error for empty entity type', () => {
      expect(() => {
        generateNodeQuery('', { id: '123' })
      }).toThrow(/invalid.*label/i)
    })

    it('should throw error for null entity type', () => {
      expect(() => {
        generateNodeQuery(null as any, { id: '123' })
      }).toThrow()
    })

    it('should handle empty data object', () => {
      const result = generateNodeQuery('Person', {})

      expect(result.query).toContain('CREATE (n:Person)')
      expect(result.params.props).toEqual({})
    })

    it('should preserve property order', () => {
      const data = {
        z_field: 'last',
        a_field: 'first',
        m_field: 'middle',
      }

      const result = generateNodeQuery('Person', data)

      const keys = Object.keys(result.params.props)
      expect(keys).toEqual(['z_field', 'a_field', 'm_field'])
    })
  })

  describe('MERGE Unique Identifiers', () => {
    it('should use correct unique identifier for each entity type', () => {
      // Person uses person_id
      const personResult = generateNodeQuery('Person', { person_id: 'P1' }, { merge: true })
      expect(personResult.query).toContain('{person_id: $person_id}')

      // BankAccount uses iban
      const accountResult = generateNodeQuery('BankAccount', { iban: 'DE123' }, { merge: true })
      expect(accountResult.query).toContain('{iban: $iban}')

      // Bank uses bank_id
      const bankResult = generateNodeQuery('Bank', { bank_id: 'B1' }, { merge: true })
      expect(bankResult.query).toContain('{bank_id: $bank_id}')

      // Company uses company_id
      const companyResult = generateNodeQuery('Company', { company_id: 'C1' }, { merge: true })
      expect(companyResult.query).toContain('{company_id: $company_id}')

      // Transaction uses transaction_id
      const txnResult = generateNodeQuery('Transaction', { transaction_id: 'T1' }, { merge: true })
      expect(txnResult.query).toContain('{transaction_id: $transaction_id}')
    })

    it('should throw error when MERGE requested but unique identifier missing', () => {
      expect(() => {
        generateNodeQuery('Person', { first_name: 'John' }, { merge: true })
      }).toThrow(/missing.*person_id/i)
    })

    it('should throw error when MERGE requested for unknown entity type', () => {
      expect(() => {
        generateNodeQuery('UnknownEntity', { id: '123' }, { merge: true })
      }).toThrow(/unknown entity type/i)
    })
  })
})
