/**
 * Cypher Query Validators
 * Validation utilities for safe Cypher query generation
 */

/**
 * Validates a Neo4j label against naming rules.
 * Neo4j labels must start with a letter or underscore, followed by letters, numbers, or underscores.
 * This prevents Cypher injection via malicious label names.
 *
 * @param label - The label to validate
 * @returns True if the label is valid
 *
 * @example
 * ```typescript
 * isValidNeo4jLabel('Account')        // Returns: true
 * isValidNeo4jLabel('_Account_2025')  // Returns: true
 * isValidNeo4jLabel('123Account')     // Returns: false (starts with number)
 * isValidNeo4jLabel('Account; DROP')  // Returns: false (contains semicolon)
 * ```
 */
export function isValidNeo4jLabel(label: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(label)
}
