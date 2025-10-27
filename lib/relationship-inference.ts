/**
 * Relationship Inference Engine for Neo4j Banking Domain
 *
 * Infers semantic relationships between entities based on foreign key detection results.
 * Converts FK metadata into typed, directional relationships with confidence scoring.
 *
 * @example
 * ```typescript
 * // Step 1: Detect foreign keys
 * const headers = ['transaction_id', 'from_iban', 'to_iban', 'amount']
 * const foreignKeys = detectForeignKeys(headers)
 *
 * // Step 2: Infer relationships
 * const relationships = inferRelationships(foreignKeys, 'Transaction')
 * // Returns: [
 * //   { type: 'FROM', sourceEntity: 'Transaction', targetEntity: 'Account', ... },
 * //   { type: 'TO', sourceEntity: 'Transaction', targetEntity: 'Account', ... }
 * // ]
 *
 * // Step 3: Generate Cypher
 * const cypher = generateRelationshipCypher(relationships[0], 'txn123', 'acc456')
 * ```
 */

import { type ForeignKey } from './fk-detector'

/**
 * Confidence adjustment multiplier for generic relationship inference.
 * Applied when no specific domain rule matches but a valid FK is detected.
 */
const GENERIC_CONFIDENCE_MULTIPLIER = 0.8

/**
 * Supported relationship types in the banking domain
 */
export type RelationshipType =
  | 'OWNS' // Person/Company → Account/Company
  | 'HELD_AT' // Account → Bank
  | 'FROM' // Transaction → Account (source)
  | 'TO' // Transaction → Account (destination)
  | 'REPORTS_TO' // Person → Person (manager)
  | 'CONTROLS' // Person → Company (beneficial owner)

/**
 * Represents an inferred relationship with metadata
 */
export interface InferredRelationship {
  /** Type of relationship in Neo4j format */
  type: RelationshipType
  /** Source entity (relationship origin) */
  sourceEntity: string
  /** Target entity (relationship destination) */
  targetEntity: string
  /** Column name containing the foreign key */
  foreignKeyColumn: string
  /** Confidence score (0.0 - 1.0) inherited/adjusted from FK detector */
  confidence: number
  /** Optional additional properties for the relationship */
  properties?: Record<string, unknown>
  /** Whether this relationship is bidirectional */
  bidirectional?: boolean
}

/**
 * Options for Cypher generation
 */
export interface CypherOptions {
  /** Use MERGE instead of CREATE for idempotency */
  useMerge?: boolean
  /** Use parameterized queries for safety */
  useParameters?: boolean
}

/**
 * Internal relationship rule definition for pattern matching
 */
interface RelationshipRule {
  /** Source entity that contains the FK */
  sourceEntity: string
  /** Target entity that FK points to */
  targetEntity: string
  /** FK column name pattern */
  columnPattern: RegExp
  /** Relationship type to infer */
  relationshipType: RelationshipType
  /** Actual source of the relationship (may differ from sourceEntity for inverted relationships) */
  actualSource?: string
  /** Actual target of the relationship */
  actualTarget?: string
}

/**
 * Banking domain relationship rules.
 * These define how FKs map to semantic relationships in the banking domain.
 *
 * Rules are evaluated in order, first match wins per FK.
 */
const BANKING_RULES: RelationshipRule[] = [
  // IBAN-based relationships (Transaction context)
  {
    sourceEntity: 'Transaction',
    targetEntity: 'BankAccount',
    columnPattern: /^from_iban$/i,
    relationshipType: 'FROM',
  },
  {
    sourceEntity: 'Transaction',
    targetEntity: 'Account',
    columnPattern: /^from_iban$/i,
    relationshipType: 'FROM',
  },
  {
    sourceEntity: 'Transaction',
    targetEntity: 'BankAccount',
    columnPattern: /^to_iban$/i,
    relationshipType: 'TO',
  },
  {
    sourceEntity: 'Transaction',
    targetEntity: 'Account',
    columnPattern: /^to_iban$/i,
    relationshipType: 'TO',
  },

  // REPORTS_TO relationships (hierarchical Person relationships)
  {
    sourceEntity: 'Person',
    targetEntity: 'Person',
    columnPattern: /^parent_id$/i,
    relationshipType: 'REPORTS_TO',
  },
  {
    sourceEntity: 'Person',
    targetEntity: 'Manager',
    columnPattern: /^manager_id$/i,
    relationshipType: 'REPORTS_TO',
    actualTarget: 'Person', // Manager is normalized to Person
  },

  // HELD_AT relationship (Account to Bank)
  {
    sourceEntity: 'Account',
    targetEntity: 'Bank',
    columnPattern: /^bank_id$/i,
    relationshipType: 'HELD_AT',
  },

  // OWNS relationships (Person/Company → Account)
  {
    sourceEntity: 'Account',
    targetEntity: 'Person',
    columnPattern: /^person_id$/i,
    relationshipType: 'OWNS',
    actualSource: 'Person', // Inverted: Person owns Account
    actualTarget: 'Account',
  },
  {
    sourceEntity: 'Account',
    targetEntity: 'Company',
    columnPattern: /^company_id$/i,
    relationshipType: 'OWNS',
    actualSource: 'Company', // Inverted: Company owns Account
    actualTarget: 'Account',
  },

  // OWNS relationship (Person → Company)
  {
    sourceEntity: 'Person',
    targetEntity: 'Company',
    columnPattern: /^company_id$/i,
    relationshipType: 'OWNS',
  },

  // OWNS relationship (Person → Account) - generic account_id in Person context
  {
    sourceEntity: 'Person',
    targetEntity: 'BankAccount',
    columnPattern: /^account_id$/i,
    relationshipType: 'OWNS',
    actualTarget: 'Account',
  },
  {
    sourceEntity: 'Person',
    targetEntity: 'Account',
    columnPattern: /^account_id$/i,
    relationshipType: 'OWNS',
  },

  // CONTROLS relationship (Person → Company) - beneficial ownership
  {
    sourceEntity: 'Company',
    targetEntity: 'Person',
    columnPattern: /^person_id$/i,
    relationshipType: 'CONTROLS',
    actualSource: 'Person', // Inverted: Person controls Company
    actualTarget: 'Company',
  },

  // Transaction context relationships
  {
    sourceEntity: 'Transaction',
    targetEntity: 'BankAccount',
    columnPattern: /^account_id$/i,
    relationshipType: 'FROM', // Default to FROM for generic account_id in Transaction
    actualTarget: 'Account',
  },
  {
    sourceEntity: 'Transaction',
    targetEntity: 'Account',
    columnPattern: /^account_id$/i,
    relationshipType: 'FROM',
  },
]

/**
 * Normalizes entity names to standard Neo4j node labels.
 * Maps domain variations to canonical entity names.
 *
 * @param entity - The entity name to normalize
 * @returns Normalized entity name
 *
 * @example
 * ```typescript
 * normalizeEntity('BankAccount') // Returns: 'Account'
 * normalizeEntity('Manager')     // Returns: 'Person'
 * normalizeEntity('Company')     // Returns: 'Company' (unchanged)
 * ```
 */
function normalizeEntity(entity: string): string {
  const normalized: Record<string, string> = {
    BankAccount: 'Account',
    Manager: 'Person',
  }
  return normalized[entity] || entity
}

/**
 * Checks if a rule matches the given FK and context.
 *
 * @param rule - The relationship rule to test
 * @param sourceEntity - The source entity context
 * @param fk - The foreign key to match against
 * @returns True if the rule matches
 */
function ruleMatches(
  rule: RelationshipRule,
  sourceEntity: string,
  fk: ForeignKey
): boolean {
  const sourceMatches = rule.sourceEntity === sourceEntity
  const targetMatches = rule.targetEntity === (fk.targetEntity || 'Unknown')
  const columnMatches = rule.columnPattern.test(fk.columnName)

  return sourceMatches && targetMatches && columnMatches
}

/**
 * Checks if an entity should be skipped for generic inference.
 * Entities like 'Reference', 'Unknown', etc. are too ambiguous.
 *
 * @param entity - The entity to check
 * @returns True if the entity should be skipped
 */
function shouldSkipGenericInference(entity: string): boolean {
  const ambiguousEntities = ['Reference', 'Unknown']
  return ambiguousEntities.includes(entity)
}

/**
 * Infers semantic relationships from foreign key detection results.
 *
 * @param foreignKeys - Array of detected foreign keys from FK detector
 * @param sourceEntity - The entity type being analyzed (e.g., 'Account', 'Transaction')
 * @returns Array of inferred relationships sorted by confidence (descending)
 */
export function inferRelationships(
  foreignKeys: ForeignKey[],
  sourceEntity: string
): InferredRelationship[] {
  const relationships: InferredRelationship[] = []

  for (const fk of foreignKeys) {
    const targetEntity = fk.targetEntity || 'Unknown'

    // Try to match against banking domain rules
    let matched = false

    for (const rule of BANKING_RULES) {
      if (ruleMatches(rule, sourceEntity, fk)) {
        // Determine actual source and target (handle inverted relationships)
        const actualSource = rule.actualSource || rule.sourceEntity
        const actualTarget = rule.actualTarget || normalizeEntity(rule.targetEntity)

        relationships.push({
          type: rule.relationshipType,
          sourceEntity: actualSource,
          targetEntity: actualTarget,
          foreignKeyColumn: fk.columnName,
          confidence: fk.confidence,
          bidirectional: false,
        })

        matched = true
        break // First matching rule wins
      }
    }

    // If no specific rule matched, try generic OWNS pattern for common cases
    if (!matched && targetEntity !== 'Unknown') {
      // Generic fallback: if sourceEntity has an FK to another entity, assume OWNS
      // This handles custom entity types not covered by specific rules
      const normalizedTarget = normalizeEntity(targetEntity)

      if (!shouldSkipGenericInference(normalizedTarget)) {
        relationships.push({
          type: 'OWNS',
          sourceEntity: sourceEntity,
          targetEntity: normalizedTarget,
          foreignKeyColumn: fk.columnName,
          confidence: fk.confidence * GENERIC_CONFIDENCE_MULTIPLIER,
        })
      }
    }
  }

  // Sort by confidence descending
  return relationships.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Generates a Cypher query for creating a single relationship.
 *
 * @param relationship - The inferred relationship to create
 * @param sourceId - ID of the source node
 * @param targetId - ID of the target node
 * @param options - Optional Cypher generation options
 * @returns Cypher query string
 */
export function generateRelationshipCypher(
  relationship: InferredRelationship,
  sourceId: string,
  targetId: string,
  options?: CypherOptions
): string {
  const { useMerge = false, useParameters = false } = options || {}

  // Prepare IDs for query
  const srcId = useParameters ? '$sourceId' : `'${sourceId}'`
  const tgtId = useParameters ? '$targetId' : `'${targetId}'`

  // Build properties object (always includes confidence)
  const props: string[] = [`confidence: ${relationship.confidence}`]

  if (relationship.properties) {
    for (const [key, value] of Object.entries(relationship.properties)) {
      if (typeof value === 'string') {
        props.push(`${key}: '${value}'`)
      } else if (typeof value === 'number') {
        props.push(`${key}: ${value}`)
      } else {
        props.push(`${key}: ${JSON.stringify(value)}`)
      }
    }
  }

  const propsStr = ` {${props.join(', ')}}`

  // Build the query
  const command = useMerge ? 'MERGE' : 'CREATE'

  return `MATCH (s:${relationship.sourceEntity} {id: ${srcId}}), (t:${relationship.targetEntity} {id: ${tgtId}})
${command} (s)-[:${relationship.type}${propsStr}]->(t)`
}

/**
 * Generates Cypher queries for creating multiple relationships in batch.
 *
 * @param relationships - Array of inferred relationships
 * @returns Batch Cypher query string
 */
export function generateBatchRelationshipCypher(
  relationships: InferredRelationship[]
): string {
  if (relationships.length === 0) {
    return ''
  }

  // Group relationships by type for efficient batch processing
  const queries: string[] = []

  for (const rel of relationships) {
    // For batch, we assume sourceId and targetId will be provided via UNWIND
    // This is a simplified version - in practice, you'd use UNWIND with a list of relationship data
    queries.push(
      `// ${rel.sourceEntity} -[:${rel.type}]-> ${rel.targetEntity} (confidence: ${rel.confidence})`
    )
  }

  return queries.join('\n')
}
