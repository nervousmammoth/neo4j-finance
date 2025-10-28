import { describe, it, expect } from 'vitest'
import {
  inferRelationships,
  generateRelationshipCypher,
  generateBatchRelationshipCypher,
  type InferredRelationship,
  type RelationshipType,
} from '@/lib/relationship-inference'
import { type ForeignKey } from '@/lib/fk-detector'

describe('Relationship Inference Engine', () => {
  describe('Basic Relationship Inference', () => {
    it('should infer Person OWNS Account relationship via person_id', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'person_id',
          confidence: 0.95,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('OWNS')
      expect(result[0].sourceEntity).toBe('Person')
      expect(result[0].targetEntity).toBe('Account')
      expect(result[0].foreignKeyColumn).toBe('person_id')
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('should infer Company OWNS Account relationship via company_id', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'company_id',
          confidence: 0.95,
          targetEntity: 'Company',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('OWNS')
      expect(result[0].sourceEntity).toBe('Company')
      expect(result[0].targetEntity).toBe('Account')
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('should infer Account HELD_AT Bank relationship via bank_id', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'bank_id',
          confidence: 0.95,
          targetEntity: 'Bank',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('HELD_AT')
      expect(result[0].sourceEntity).toBe('Account')
      expect(result[0].targetEntity).toBe('Bank')
      expect(result[0].foreignKeyColumn).toBe('bank_id')
    })

    it('should infer Transaction FROM Account relationship via from_iban', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'from_iban',
          confidence: 0.90,
          targetEntity: 'BankAccount',
          patternType: 'iban',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Transaction')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('FROM')
      expect(result[0].sourceEntity).toBe('Transaction')
      expect(result[0].targetEntity).toBe('Account')
      expect(result[0].foreignKeyColumn).toBe('from_iban')
    })

    it('should infer Transaction TO Account relationship via to_iban', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'to_iban',
          confidence: 0.90,
          targetEntity: 'BankAccount',
          patternType: 'iban',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Transaction')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('TO')
      expect(result[0].sourceEntity).toBe('Transaction')
      expect(result[0].targetEntity).toBe('Account')
    })

    it('should infer Person OWNS Company relationship via company_id in Person context', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'company_id',
          confidence: 0.95,
          targetEntity: 'Company',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Person')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('OWNS')
      expect(result[0].sourceEntity).toBe('Person')
      expect(result[0].targetEntity).toBe('Company')
    })

    it('should infer Person REPORTS_TO Person relationship via parent_id or manager_id', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'parent_id',
          confidence: 0.90,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Person')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('REPORTS_TO')
      expect(result[0].sourceEntity).toBe('Person')
      expect(result[0].targetEntity).toBe('Person')
      expect(result[0].foreignKeyColumn).toBe('parent_id')
    })
  })

  describe('Multiple Relationships', () => {
    it('should infer multiple relationships from multiple foreign keys', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'person_id',
          confidence: 0.95,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
        {
          columnName: 'bank_id',
          confidence: 0.95,
          targetEntity: 'Bank',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      expect(result).toHaveLength(2)

      const ownsRel = result.find((r) => r.type === 'OWNS')
      const heldAtRel = result.find((r) => r.type === 'HELD_AT')

      expect(ownsRel).toBeDefined()
      expect(heldAtRel).toBeDefined()
    })

    it('should infer bidirectional FROM/TO relationships for transactions', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'from_iban',
          confidence: 0.90,
          targetEntity: 'BankAccount',
          patternType: 'iban',
        },
        {
          columnName: 'to_iban',
          confidence: 0.90,
          targetEntity: 'BankAccount',
          patternType: 'iban',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Transaction')

      expect(result).toHaveLength(2)

      const fromRel = result.find((r) => r.type === 'FROM')
      const toRel = result.find((r) => r.type === 'TO')

      expect(fromRel).toBeDefined()
      expect(toRel).toBeDefined()
      expect(fromRel!.targetEntity).toBe('Account')
      expect(toRel!.targetEntity).toBe('Account')
    })

    it('should handle self-referencing relationships correctly', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'parent_id',
          confidence: 0.90,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Person')

      expect(result).toHaveLength(1)
      expect(result[0].sourceEntity).toBe('Person')
      expect(result[0].targetEntity).toBe('Person')
      expect(result[0].type).toBe('REPORTS_TO')
    })
  })

  describe('Confidence Scoring', () => {
    it('should inherit high confidence from domain-specific FK patterns', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'person_id',
          confidence: 0.95,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      expect(result[0].confidence).toBeGreaterThanOrEqual(0.90)
    })

    it('should assign appropriate confidence for generic FK patterns', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'owner_id',
          confidence: 0.75,
          targetEntity: 'Owner',
          patternType: 'suffix_id',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      // Generic patterns should still produce relationships but with adjusted confidence
      expect(result.length).toBeGreaterThanOrEqual(0)
      if (result.length > 0) {
        expect(result[0].confidence).toBeGreaterThan(0)
        expect(result[0].confidence).toBeLessThanOrEqual(1.0)
      }
    })

    it('should sort relationships by confidence descending', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'ref_code',
          confidence: 0.50,
          targetEntity: 'Reference',
          patternType: 'reference',
        },
        {
          columnName: 'person_id',
          confidence: 0.95,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
        {
          columnName: 'bank_id',
          confidence: 0.95,
          targetEntity: 'Bank',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      // Verify sorted by confidence (highest first)
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].confidence).toBeGreaterThanOrEqual(result[i + 1].confidence)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should return empty array when no foreign keys are provided', () => {
      const foreignKeys: ForeignKey[] = []
      const result = inferRelationships(foreignKeys, 'Account')

      expect(result).toEqual([])
    })

    it('should handle unrecognized FK patterns gracefully', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'unknown_field_id',
          confidence: 0.80,
          targetEntity: 'UnknownEntity',
          patternType: 'suffix_id',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      // Should either skip unrecognized patterns or assign generic relationship
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle FK without targetEntity', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'some_id',
          confidence: 0.75,
          targetEntity: undefined,
          patternType: 'suffix_id',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      // Should handle gracefully, likely skip since targetEntity is undefined
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle ambiguous relationship scenarios', () => {
      // Multiple possible interpretations - should pick most likely
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'account_id',
          confidence: 0.95,
          targetEntity: 'BankAccount',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Person')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('OWNS')
    })

    it('should detect circular relationship potential', () => {
      // Person -> Company -> Person scenario
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'person_id',
          confidence: 0.95,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Company')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('CONTROLS')
      expect(result[0].sourceEntity).toBe('Person')
      expect(result[0].targetEntity).toBe('Company')
    })

    it('should handle many-to-many relationship hints', () => {
      // Junction table pattern: CompanyPerson with company_id + person_id
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'company_id',
          confidence: 0.95,
          targetEntity: 'Company',
          patternType: 'domain_specific',
        },
        {
          columnName: 'person_id',
          confidence: 0.95,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'CompanyPerson')

      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle composite key scenarios', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'country_code',
          confidence: 0.60,
          targetEntity: 'Country',
          patternType: 'reference',
        },
        {
          columnName: 'bank_id',
          confidence: 0.95,
          targetEntity: 'Bank',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      // Should still infer valid relationships
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle FK columns with NULL implications', () => {
      // Nullable FK might have different semantics
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'parent_id',
          confidence: 0.90,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Person')

      expect(result).toHaveLength(1)
      // Relationship should be inferred even if column allows NULL
      expect(result[0].type).toBe('REPORTS_TO')
    })
  })

  describe('Relationship Properties and Metadata', () => {
    it('should include relationship properties when applicable', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'person_id',
          confidence: 0.95,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      expect(result[0]).toHaveProperty('confidence')
      expect(result[0]).toHaveProperty('type')
      expect(result[0]).toHaveProperty('sourceEntity')
      expect(result[0]).toHaveProperty('targetEntity')
    })

    it('should mark bidirectional relationships when appropriate', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'from_iban',
          confidence: 0.90,
          targetEntity: 'BankAccount',
          patternType: 'iban',
        },
        {
          columnName: 'to_iban',
          confidence: 0.90,
          targetEntity: 'BankAccount',
          patternType: 'iban',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Transaction')

      // FROM and TO are directionally distinct, not bidirectional
      expect(result[0].bidirectional).toBeFalsy()
      expect(result[1].bidirectional).toBeFalsy()
    })

    it('should preserve original foreign key column name', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: '  person_id  ',
          confidence: 0.95,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      expect(result[0].foreignKeyColumn).toBe('  person_id  ')
    })
  })

  describe('Cypher Query Generation', () => {
    it('should generate CREATE statement for simple relationship', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
      }

      const cypher = generateRelationshipCypher(relationship, 'person123', 'acc456')

      expect(cypher).toContain('MATCH')
      expect(cypher).toContain('Person')
      expect(cypher).toContain('Account')
      expect(cypher).toContain('OWNS')
      // Default is now parameterized for security
      expect(cypher).toContain('$sourceId')
      expect(cypher).toContain('$targetId')
    })

    it('should generate MERGE statement for idempotent relationships', () => {
      const relationship: InferredRelationship = {
        type: 'HELD_AT',
        sourceEntity: 'Account',
        targetEntity: 'Bank',
        foreignKeyColumn: 'bank_id',
        confidence: 0.95,
      }

      const cypher = generateRelationshipCypher(
        relationship,
        'acc123',
        'bank456',
        { useMerge: true }
      )

      expect(cypher).toContain('MERGE')
    })

    it('should include confidence as relationship property', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
      }

      const cypher = generateRelationshipCypher(relationship, 'p1', 'a1')

      expect(cypher).toContain('confidence')
      expect(cypher).toContain('0.95')
    })

    it('should generate parameterized queries', () => {
      const relationship: InferredRelationship = {
        type: 'FROM',
        sourceEntity: 'Transaction',
        targetEntity: 'Account',
        foreignKeyColumn: 'from_iban',
        confidence: 0.90,
      }

      const cypher = generateRelationshipCypher(relationship, 'txn1', 'acc1', {
        useParameters: true,
      })

      expect(cypher).toContain('$sourceId')
      expect(cypher).toContain('$targetId')
    })

    it('should generate batch relationship creation queries', () => {
      const relationships: InferredRelationship[] = [
        {
          type: 'OWNS',
          sourceEntity: 'Person',
          targetEntity: 'Account',
          foreignKeyColumn: 'person_id',
          confidence: 0.95,
        },
        {
          type: 'HELD_AT',
          sourceEntity: 'Account',
          targetEntity: 'Bank',
          foreignKeyColumn: 'bank_id',
          confidence: 0.95,
        },
      ]

      const cypher = generateBatchRelationshipCypher(relationships)

      expect(cypher).toContain('OWNS')
      expect(cypher).toContain('HELD_AT')
      expect(typeof cypher).toBe('string')
      expect(cypher.length).toBeGreaterThan(0)
    })

    it('should handle relationship properties in Cypher generation', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Company',
        foreignKeyColumn: 'company_id',
        confidence: 0.95,
        properties: {
          ownership_percentage: 100,
          since: '2024-01-01',
        },
      }

      const cypher = generateRelationshipCypher(relationship, 'p1', 'c1')

      expect(cypher).toContain('ownership_percentage')
      expect(cypher).toContain('since')
    })

    it('should handle empty batch gracefully', () => {
      const relationships: InferredRelationship[] = []
      const cypher = generateBatchRelationshipCypher(relationships)

      expect(cypher).toBe('')
    })

    it('should handle complex property types in Cypher generation', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Company',
        foreignKeyColumn: 'company_id',
        confidence: 0.95,
        properties: {
          active: true,
          metadata: { foo: 'bar' },
          tags: ['shareholder', 'board-member'],
        },
      }

      const cypher = generateRelationshipCypher(relationship, 'p1', 'c1')

      expect(cypher).toContain('active')
      expect(cypher).toContain('metadata')
      expect(cypher).toContain('tags')
    })

    it('should generate Cypher without properties when none are provided', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
        // No properties field
      }

      const cypher = generateRelationshipCypher(relationship, 'p1', 'a1')

      // Should still include confidence but in a clean way
      expect(cypher).toContain('OWNS')
      expect(cypher).toContain('confidence: 0.95')
    })
  })

  describe('Domain-Specific Rules', () => {
    it('should recognize manager_id as REPORTS_TO relationship', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'manager_id',
          confidence: 0.90,
          targetEntity: 'Manager',
          patternType: 'suffix_id',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Person')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('REPORTS_TO')
      expect(result[0].targetEntity).toBe('Person')
    })

    it('should normalize BankAccount entity to Account', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'from_iban',
          confidence: 0.90,
          targetEntity: 'BankAccount',
          patternType: 'iban',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Transaction')

      expect(result[0].targetEntity).toBe('Account')
    })

    it('should handle account_id with proper context sensitivity', () => {
      // When in Transaction, account_id means Transaction->Account
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'account_id',
          confidence: 0.95,
          targetEntity: 'BankAccount',
          patternType: 'domain_specific',
        },
      ]

      const transactionResult = inferRelationships(foreignKeys, 'Transaction')
      expect(transactionResult[0].sourceEntity).toBe('Transaction')
      expect(transactionResult[0].targetEntity).toBe('Account')

      // When in Person, account_id means Person->Account
      const personResult = inferRelationships(foreignKeys, 'Person')
      expect(personResult[0].sourceEntity).toBe('Person')
      expect(personResult[0].targetEntity).toBe('Account')
    })
  })

  describe('Security: Cypher Injection Prevention', () => {
    it('should prevent Cypher injection via malicious sourceId', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
      }

      const maliciousId = "p1'} MATCH (n) DETACH DELETE n; //"
      const cypher = generateRelationshipCypher(
        relationship,
        maliciousId,
        'acc123',
        { useParameters: false }
      )

      // Should escape single quotes to prevent injection
      expect(cypher).toContain("p1\\'")
      expect(cypher).toContain("DETACH DELETE")
      // Verify the quote is escaped (the malicious payload is treated as string data)
      expect(cypher).toContain("'p1\\'} MATCH (n) DETACH DELETE n; //'")
    })

    it('should prevent Cypher injection via malicious targetId', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
      }

      const maliciousId = "acc1'} CREATE (x:Hacker) //"
      const cypher = generateRelationshipCypher(
        relationship,
        'p123',
        maliciousId,
        { useParameters: false }
      )

      // Should escape single quotes
      expect(cypher).toContain("acc1\\'")
      expect(cypher).toContain("CREATE")
      // Verify the quote is escaped (the malicious payload is treated as string data)
      expect(cypher).toContain("'acc1\\'} CREATE (x:Hacker) //'")
    })

    it('should prevent Cypher injection via malicious property values', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Company',
        foreignKeyColumn: 'company_id',
        confidence: 0.95,
        properties: {
          note: "x'} MATCH (n) DETACH DELETE n; //",
        },
      }

      const cypher = generateRelationshipCypher(
        relationship,
        'p1',
        'c1',
        { useParameters: false }
      )

      // Should escape properties to prevent injection
      expect(cypher).toContain("x\\'")
      expect(cypher).toContain("DETACH DELETE")
      // Verify the quote is escaped (the malicious payload is treated as string data)
      expect(cypher).toContain("note: 'x\\'} MATCH (n) DETACH DELETE n; //'")
    })

    it('should prevent backslash-quote bypass attack in sourceId', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
      }

      // Attack: backslash followed by quote attempts to escape our escaping
      const maliciousId = "test\\'"
      const cypher = generateRelationshipCypher(
        relationship,
        maliciousId,
        'acc123',
        { useParameters: false }
      )

      // Should escape backslashes BEFORE quotes
      // Input: test\' → Should become: test\\\' (backslash escaped, then quote escaped)
      expect(cypher).toContain("test\\\\\\'")
      // Verify the entire malicious ID is properly contained as a string
      expect(cypher).toContain("{id: 'test\\\\\\''}")
      // And the second ID is also properly quoted
      expect(cypher).toContain("{id: 'acc123'}")
    })

    it('should prevent backslash-quote bypass attack in targetId', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
      }

      // Attack: backslash followed by quote attempts to escape our escaping
      const maliciousId = "test\\'"
      const cypher = generateRelationshipCypher(
        relationship,
        'p123',
        maliciousId,
        { useParameters: false }
      )

      // Should escape backslashes BEFORE quotes
      expect(cypher).toContain("test\\\\\\'")
      // Verify the entire malicious ID is properly contained as a string
      expect(cypher).toContain("{id: 'test\\\\\\''}")
      // And the source ID is also properly quoted
      expect(cypher).toContain("{id: 'p123'}")
    })

    it('should prevent backslash-quote bypass attack in property values', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Company',
        foreignKeyColumn: 'company_id',
        confidence: 0.95,
        properties: {
          note: "test\\' } MATCH (n) DETACH DELETE n; //",
        },
      }

      const cypher = generateRelationshipCypher(
        relationship,
        'p1',
        'c1',
        { useParameters: false }
      )

      // Should escape both backslashes and quotes
      expect(cypher).toContain("test\\\\\\'")
      expect(cypher).toContain("DETACH DELETE")
      // Verify the attack is neutralized (entire string is escaped and contained)
      expect(cypher).toContain("note: 'test\\\\\\' } MATCH (n) DETACH DELETE n; //'")
    })

    it('should handle realistic Cypher injection payloads', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
        properties: {
          description: "x'} MATCH (n) DETACH DELETE n; //",
        },
      }

      const cypher = generateRelationshipCypher(
        relationship,
        'p1',
        'a1',
        { useParameters: false }
      )

      // Should escape the quote, preventing the payload from breaking out
      expect(cypher).toContain("x\\'")
      expect(cypher).toContain("} MATCH (n) DETACH DELETE n; //")
      // Verify it's treated as string data, not executed code
      expect(cypher).toContain("description: 'x\\'} MATCH (n) DETACH DELETE n; //'")
    })

    it('should reject invalid property keys with injection attempts', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
        properties: {
          "x': 1}); DROP": "value",
        },
      }

      expect(() => {
        generateRelationshipCypher(relationship, 'p1', 'a1')
      }).toThrow(/invalid.*property key/i)
    })

    it('should reject property keys starting with numbers', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
        properties: {
          "123key": "value",
        },
      }

      expect(() => {
        generateRelationshipCypher(relationship, 'p1', 'a1')
      }).toThrow(/invalid.*property key/i)
    })

    it('should reject property keys with special characters', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
        properties: {
          "key-with-dash": "value",
        },
      }

      expect(() => {
        generateRelationshipCypher(relationship, 'p1', 'a1')
      }).toThrow(/invalid.*property key/i)
    })

    it('should accept valid property keys', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
        properties: {
          valid_key: "value",
          _privateKey: "value",
          key123: "value",
        },
      }

      expect(() => {
        generateRelationshipCypher(relationship, 'p1', 'a1')
      }).not.toThrow()
    })

    it('should reject invalid Neo4j labels in sourceEntity', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person; DROP ALL',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
      }

      expect(() => {
        generateRelationshipCypher(relationship, 'p1', 'a1')
      }).toThrow(/invalid.*label/i)
    })

    it('should reject invalid Neo4j labels in targetEntity', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account; CREATE (x:Hacker)',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
      }

      expect(() => {
        generateRelationshipCypher(relationship, 'p1', 'a1')
      }).toThrow(/invalid.*label/i)
    })

    it('should accept valid Neo4j labels', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'BankAccount_2025',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
      }

      expect(() => {
        generateRelationshipCypher(relationship, 'p1', 'a1')
      }).not.toThrow()
    })

    it('should reject labels starting with numbers', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: '123Account',
        targetEntity: 'Person',
        foreignKeyColumn: 'account_id',
        confidence: 0.95,
      }

      expect(() => {
        generateRelationshipCypher(relationship, 'a1', 'p1')
      }).toThrow(/invalid.*label/i)
    })

    it('should default to parameterized queries for security', () => {
      const relationship: InferredRelationship = {
        type: 'OWNS',
        sourceEntity: 'Person',
        targetEntity: 'Account',
        foreignKeyColumn: 'person_id',
        confidence: 0.95,
      }

      // Call without options - should default to parameterized
      const cypher = generateRelationshipCypher(relationship, 'p123', 'a456')

      expect(cypher).toContain('$sourceId')
      expect(cypher).toContain('$targetId')
      expect(cypher).not.toContain("'p123'")
      expect(cypher).not.toContain("'a456'")
    })

    it('should use parameterized queries when explicitly enabled', () => {
      const relationship: InferredRelationship = {
        type: 'FROM',
        sourceEntity: 'Transaction',
        targetEntity: 'Account',
        foreignKeyColumn: 'from_iban',
        confidence: 0.90,
      }

      const cypher = generateRelationshipCypher(relationship, 'txn1', 'acc1', {
        useParameters: true,
      })

      expect(cypher).toContain('$sourceId')
      expect(cypher).toContain('$targetId')
      // Should not contain raw IDs
      expect(cypher).not.toContain("'txn1'")
      expect(cypher).not.toContain("'acc1'")
    })
  })

  describe('Type Safety and Validation', () => {
    it('should return properly typed RelationshipType values', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'person_id',
          confidence: 0.95,
          targetEntity: 'Person',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      const validTypes: RelationshipType[] = [
        'OWNS',
        'HELD_AT',
        'FROM',
        'TO',
        'REPORTS_TO',
        'CONTROLS',
      ]
      expect(validTypes).toContain(result[0].type)
    })

    it('should ensure all required fields are present in InferredRelationship', () => {
      const foreignKeys: ForeignKey[] = [
        {
          columnName: 'bank_id',
          confidence: 0.95,
          targetEntity: 'Bank',
          patternType: 'domain_specific',
        },
      ]

      const result = inferRelationships(foreignKeys, 'Account')

      expect(result[0]).toHaveProperty('type')
      expect(result[0]).toHaveProperty('sourceEntity')
      expect(result[0]).toHaveProperty('targetEntity')
      expect(result[0]).toHaveProperty('foreignKeyColumn')
      expect(result[0]).toHaveProperty('confidence')
    })
  })
})
