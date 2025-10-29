/**
 * Cypher Query Utilities
 * Shared utilities for Cypher query generation
 */

import { isValidNeo4jLabel } from './validators'

/**
 * Mapping of entity types to their unique identifier field names
 */
export const UNIQUE_IDENTIFIERS: Record<string, string> = {
  Person: 'person_id',
  BankAccount: 'iban',
  Bank: 'bank_id',
  Company: 'company_id',
  Transaction: 'transaction_id',
}

/**
 * Filters out undefined values from data object while preserving null values
 *
 * @param data - The input data object
 * @returns A new object with undefined values removed
 *
 * @example
 * ```typescript
 * filterUndefinedValues({ a: 1, b: null, c: undefined })
 * // Returns: { a: 1, b: null }
 * ```
 */
export function filterUndefinedValues(
  data: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  )
}

/**
 * Gets the unique identifier field name for an entity type
 *
 * @param entityType - The entity type label
 * @returns The unique identifier field name
 * @throws {Error} If entity type is unknown
 *
 * @example
 * ```typescript
 * getUniqueIdentifierField('Person')    // Returns: 'person_id'
 * getUniqueIdentifierField('BankAccount') // Returns: 'iban'
 * ```
 */
export function getUniqueIdentifierField(entityType: string): string {
  const uniqueIdField = UNIQUE_IDENTIFIERS[entityType]

  if (!uniqueIdField) {
    throw new Error(
      `Unknown entity type: "${entityType}". Cannot determine unique identifier. Supported types: ${Object.keys(UNIQUE_IDENTIFIERS).join(', ')}`
    )
  }

  return uniqueIdField
}

/**
 * Validates a Neo4j identifier (label or relationship type)
 *
 * @param identifier - The identifier to validate
 * @param identifierType - The type of identifier ('label' or 'relationship type')
 * @throws {Error} If the identifier is invalid
 *
 * @example
 * ```typescript
 * validateNeo4jIdentifier('Person', 'label')  // OK
 * validateNeo4jIdentifier('OWNS', 'relationship type')  // OK
 * validateNeo4jIdentifier('123Invalid', 'label')  // Throws error
 * validateNeo4jIdentifier('DROP; //', 'label')  // Throws error
 * ```
 */
export function validateNeo4jIdentifier(
  identifier: string,
  identifierType: 'label' | 'relationship type'
): void {
  if (!identifier || !isValidNeo4jLabel(identifier)) {
    throw new Error(
      `Invalid Neo4j ${identifierType}: "${identifier}". ${identifierType === 'label' ? 'Labels' : 'Relationship types'} must start with a letter or underscore and contain only alphanumeric characters and underscores.`
    )
  }
}
