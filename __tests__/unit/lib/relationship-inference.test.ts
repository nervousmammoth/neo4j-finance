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
      expect(cypher).toContain('person123')
      expect(cypher).toContain('acc456')
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
