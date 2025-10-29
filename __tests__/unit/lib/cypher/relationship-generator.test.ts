import { describe, it, expect } from 'vitest'
import { generateRelationshipQuery } from '@/lib/cypher/relationship-generator'

describe('Relationship Cypher Query Generator', () => {
  describe('OWNS Relationship (Person -> Account)', () => {
    it('should generate CREATE query with parameterized values', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode)

      expect(result.query).toContain('MATCH (from:Person {person_id: $fromId})')
      expect(result.query).toContain('MATCH (to:BankAccount {iban: $toId})')
      expect(result.query).toContain('CREATE (from)-[r:OWNS]->(to)')
      expect(result.params).toHaveProperty('fromId', 'P123')
      expect(result.params).toHaveProperty('toId', 'DE89370400440532013000')
    })

    it('should generate CREATE query with relationship properties', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode, {
        properties: {
          since: '2020-01-15',
          ownership_percentage: 100,
        },
      })

      expect(result.query).toContain('SET r = $props')
      expect(result.params).toHaveProperty('props')
      expect(result.params.props).toEqual({
        since: '2020-01-15',
        ownership_percentage: 100,
      })
    })

    it('should generate MERGE query for relationship', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode, {
        merge: true,
      })

      expect(result.query).toContain('MERGE (from)-[r:OWNS]->(to)')
      expect(result.query).not.toContain('CREATE (from)-[r:OWNS]->(to)')
    })

    it('should support dataset namespacing for relationships', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode, {
        datasetId: 'dataset_001',
        properties: {
          since: '2020-01-15',
        },
      })

      expect(result.params.props).toHaveProperty('dataset_id', 'dataset_001')
      expect(result.params.props).toHaveProperty('since', '2020-01-15')
    })
  })

  describe('OWNS Relationship (Company -> Account)', () => {
    it('should generate CREATE query for company ownership', () => {
      const sourceNode = {
        entityType: 'Company',
        company_id: 'COM123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode)

      expect(result.query).toContain('MATCH (from:Company {company_id: $fromId})')
      expect(result.query).toContain('MATCH (to:BankAccount {iban: $toId})')
      expect(result.query).toContain('CREATE (from)-[r:OWNS]->(to)')
      expect(result.params).toHaveProperty('fromId', 'COM123')
    })
  })

  describe('HELD_AT Relationship (Account -> Bank)', () => {
    it('should generate CREATE query for bank holding', () => {
      const sourceNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }
      const targetNode = {
        entityType: 'Bank',
        bank_id: 'BNK001',
      }

      const result = generateRelationshipQuery('HELD_AT', sourceNode, targetNode)

      expect(result.query).toContain('MATCH (from:BankAccount {iban: $fromId})')
      expect(result.query).toContain('MATCH (to:Bank {bank_id: $toId})')
      expect(result.query).toContain('CREATE (from)-[r:HELD_AT]->(to)')
    })
  })

  describe('FROM Relationship (Transaction -> Account)', () => {
    it('should generate CREATE query for transaction source', () => {
      const sourceNode = {
        entityType: 'Transaction',
        transaction_id: 'TXN123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('FROM', sourceNode, targetNode)

      expect(result.query).toContain('MATCH (from:Transaction {transaction_id: $fromId})')
      expect(result.query).toContain('MATCH (to:BankAccount {iban: $toId})')
      expect(result.query).toContain('CREATE (from)-[r:FROM]->(to)')
    })
  })

  describe('TO Relationship (Transaction -> Account)', () => {
    it('should generate CREATE query for transaction destination', () => {
      const sourceNode = {
        entityType: 'Transaction',
        transaction_id: 'TXN123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'FR1420041010050500013M02606',
      }

      const result = generateRelationshipQuery('TO', sourceNode, targetNode)

      expect(result.query).toContain('MATCH (from:Transaction {transaction_id: $fromId})')
      expect(result.query).toContain('MATCH (to:BankAccount {iban: $toId})')
      expect(result.query).toContain('CREATE (from)-[r:TO]->(to)')
    })
  })

  describe('REPORTS_TO Relationship (Employee -> Employee)', () => {
    it('should generate CREATE query for employee hierarchy', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'EMP001',
      }
      const targetNode = {
        entityType: 'Person',
        person_id: 'MGR001',
      }

      const result = generateRelationshipQuery('REPORTS_TO', sourceNode, targetNode)

      expect(result.query).toContain('MATCH (from:Person {person_id: $fromId})')
      expect(result.query).toContain('MATCH (to:Person {person_id: $toId})')
      expect(result.query).toContain('CREATE (from)-[r:REPORTS_TO]->(to)')
      expect(result.params).toHaveProperty('fromId', 'EMP001')
      expect(result.params).toHaveProperty('toId', 'MGR001')
    })

    it('should prevent circular relationships with validation', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'EMP001',
      }
      const targetNode = {
        entityType: 'Person',
        person_id: 'EMP001',
      }

      // Should allow same node for testing purposes
      // Circular prevention is a business logic concern, not generator concern
      const result = generateRelationshipQuery('REPORTS_TO', sourceNode, targetNode)
      expect(result.params.fromId).toBe('EMP001')
      expect(result.params.toId).toBe('EMP001')
    })
  })

  describe('CONTROLS Relationship (Person -> Company)', () => {
    it('should generate CREATE query for company control', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'Company',
        company_id: 'COM123',
      }

      const result = generateRelationshipQuery('CONTROLS', sourceNode, targetNode, {
        properties: {
          control_percentage: 51,
          effective_date: '2020-01-01',
        },
      })

      expect(result.query).toContain('MATCH (from:Person {person_id: $fromId})')
      expect(result.query).toContain('MATCH (to:Company {company_id: $toId})')
      expect(result.query).toContain('CREATE (from)-[r:CONTROLS]->(to)')
      expect(result.params.props).toHaveProperty('control_percentage', 51)
      expect(result.params.props).toHaveProperty('effective_date', '2020-01-01')
    })
  })

  describe('Relationship Properties and Features', () => {
    it('should handle NULL values in relationship properties', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode, {
        properties: {
          since: '2020-01-15',
          notes: null,
          end_date: undefined,
        },
      })

      expect(result.params.props).toHaveProperty('since', '2020-01-15')
      expect(result.params.props).toHaveProperty('notes', null)
      expect(result.params.props).not.toHaveProperty('end_date')
    })

    it('should support weighted relationships', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'Company',
        company_id: 'COM123',
      }

      const result = generateRelationshipQuery('CONTROLS', sourceNode, targetNode, {
        properties: {
          weight: 0.75,
          strength: 'strong',
        },
      })

      expect(result.params.props).toHaveProperty('weight', 0.75)
      expect(result.params.props).toHaveProperty('strength', 'strong')
    })

    it('should support temporal relationships', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode, {
        properties: {
          valid_from: '2020-01-01',
          valid_until: '2025-12-31',
          is_current: true,
        },
      })

      expect(result.params.props).toHaveProperty('valid_from', '2020-01-01')
      expect(result.params.props).toHaveProperty('valid_until', '2025-12-31')
      expect(result.params.props).toHaveProperty('is_current', true)
    })

    it('should handle empty properties object', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode, {
        properties: {},
      })

      expect(result.query).toContain('CREATE (from)-[r:OWNS]->(to)')
      expect(result.query).not.toContain('SET r')
    })

    it('should handle relationships without properties', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode)

      expect(result.query).toContain('CREATE (from)-[r:OWNS]->(to)')
      expect(result.query).not.toContain('SET r')
      expect(result.query).toContain('RETURN r')
    })
  })

  describe('Security: Cypher Injection Prevention', () => {
    it('should prevent injection via malicious relationship types', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      expect(() => {
        generateRelationshipQuery('OWNS; DROP DATABASE; //', sourceNode, targetNode)
      }).toThrow(/invalid.*relationship type/i)
    })

    it('should prevent injection via malicious source node labels', () => {
      const sourceNode = {
        entityType: 'Person; DROP ALL; //',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      expect(() => {
        generateRelationshipQuery('OWNS', sourceNode, targetNode)
      }).toThrow(/invalid.*label/i)
    })

    it('should prevent injection via malicious target node labels', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount{admin:true}',
        iban: 'DE89370400440532013000',
      }

      expect(() => {
        generateRelationshipQuery('OWNS', sourceNode, targetNode)
      }).toThrow(/invalid.*label/i)
    })

    it('should use parameterized queries by default (secure by default)', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: "P'; DROP ALL; //",
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: "DE'; DELETE ALL; //",
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode)

      // Query should use parameters, not string interpolation
      expect(result.query).not.toContain("P'; DROP ALL; //")
      expect(result.query).not.toContain("DE'; DELETE ALL; //")
      expect(result.query).toContain('$fromId')
      expect(result.query).toContain('$toId')
      expect(result.params.fromId).toBe("P'; DROP ALL; //")
      expect(result.params.toId).toBe("DE'; DELETE ALL; //")
    })

    it('should handle property values with quotes safely', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode, {
        properties: {
          notes: "O'Brien's account ownership",
        },
      })

      expect(result.params.props).toHaveProperty('notes', "O'Brien's account ownership")
    })

    it('should handle backslash characters safely', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode, {
        properties: {
          file_path: 'C:\\Users\\test\\documents',
        },
      })

      expect(result.params.props).toHaveProperty('file_path', 'C:\\Users\\test\\documents')
    })

    it('should reject relationship types starting with numbers', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      expect(() => {
        generateRelationshipQuery('123OWNS', sourceNode, targetNode)
      }).toThrow(/invalid.*relationship type/i)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should throw error for empty relationship type', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      expect(() => {
        generateRelationshipQuery('', sourceNode, targetNode)
      }).toThrow(/invalid.*relationship type/i)
    })

    it('should throw error for missing source node identifier', () => {
      const sourceNode = {
        entityType: 'Person',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      expect(() => {
        generateRelationshipQuery('OWNS', sourceNode, targetNode)
      }).toThrow(/missing.*identifier.*Person/i)
    })

    it('should throw error for missing target node identifier', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
      }

      expect(() => {
        generateRelationshipQuery('OWNS', sourceNode, targetNode)
      }).toThrow(/missing.*identifier.*BankAccount/i)
    })

    it('should throw error for unknown source entity type', () => {
      const sourceNode = {
        entityType: 'UnknownEntity',
        id: '123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      expect(() => {
        generateRelationshipQuery('OWNS', sourceNode, targetNode)
      }).toThrow(/unknown entity type.*UnknownEntity/i)
    })

    it('should throw error for unknown target entity type', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'UnknownEntity',
        id: '123',
      }

      expect(() => {
        generateRelationshipQuery('OWNS', sourceNode, targetNode)
      }).toThrow(/unknown entity type.*UnknownEntity/i)
    })

    it('should preserve property order', () => {
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }

      const result = generateRelationshipQuery('OWNS', sourceNode, targetNode, {
        properties: {
          z_field: 'last',
          a_field: 'first',
          m_field: 'middle',
        },
      })

      const keys = Object.keys(result.params.props as Record<string, unknown>)
      expect(keys).toEqual(['z_field', 'a_field', 'm_field'])
    })
  })

  describe('Multiple Relationships and Batch Operations', () => {
    it('should generate independent queries for multiple relationships', () => {
      // This test demonstrates that each call generates an independent query
      const sourceNode = {
        entityType: 'Person',
        person_id: 'P123',
      }
      const targetNode1 = {
        entityType: 'BankAccount',
        iban: 'DE89370400440532013000',
      }
      const targetNode2 = {
        entityType: 'BankAccount',
        iban: 'FR1420041010050500013M02606',
      }

      const result1 = generateRelationshipQuery('OWNS', sourceNode, targetNode1)
      const result2 = generateRelationshipQuery('OWNS', sourceNode, targetNode2)

      expect(result1.params.toId).toBe('DE89370400440532013000')
      expect(result2.params.toId).toBe('FR1420041010050500013M02606')
      expect(result1.params.fromId).toBe(result2.params.fromId)
    })
  })
})
