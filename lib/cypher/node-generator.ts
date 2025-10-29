/**
 * Node Cypher Query Generator
 * Generates CREATE and MERGE Cypher queries for nodes with proper parameterization
 */

import { isValidNeo4jLabel } from './validators'

export interface GenerateNodeQueryOptions {
  merge?: boolean
  datasetId?: string
  useParameters?: true
}

export interface GenerateNodeQueryResult {
  query: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>
}

/**
 * Mapping of entity types to their unique identifier field names
 */
const UNIQUE_IDENTIFIERS: Record<string, string> = {
  Person: 'person_id',
  BankAccount: 'iban',
  Bank: 'bank_id',
  Company: 'company_id',
  Transaction: 'transaction_id',
}

/**
 * Generate a Cypher CREATE or MERGE query for a node
 *
 * @param entityType - The Neo4j label for the node (e.g., "Person", "BankAccount")
 * @param data - The property data for the node
 * @param options - Optional configuration for MERGE and dataset namespacing
 * @returns An object containing the Cypher query and parameters
 *
 * @throws {Error} If the entity type is invalid or missing required unique identifier for MERGE
 */
export function generateNodeQuery(
  entityType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  options?: GenerateNodeQueryOptions
): GenerateNodeQueryResult {
  // Validate entity type to prevent Cypher injection
  if (!entityType || !isValidNeo4jLabel(entityType)) {
    throw new Error(
      `Invalid Neo4j label: "${entityType}". Labels must start with a letter or underscore and contain only alphanumeric characters and underscores.`
    )
  }

  const { merge = false, datasetId } = options || {}

  // Filter out undefined values, but keep null values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredData: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      filteredData[key] = value
    }
  }

  // Add dataset namespace if provided
  const props = datasetId
    ? { dataset_id: datasetId, ...filteredData }
    : filteredData

  if (merge) {
    // Get the unique identifier for this entity type
    const uniqueIdField = UNIQUE_IDENTIFIERS[entityType]

    if (!uniqueIdField) {
      throw new Error(
        `Unknown entity type: "${entityType}". Cannot determine unique identifier for MERGE operation.`
      )
    }

    if (!(uniqueIdField in props)) {
      throw new Error(
        `Missing required unique identifier "${uniqueIdField}" for MERGE operation on ${entityType}`
      )
    }

    const uniqueIdValue = props[uniqueIdField]

    // MERGE query: match on unique identifier, then set all properties
    const query = `MERGE (n:${entityType} {${uniqueIdField}: $${uniqueIdField}}) SET n += $props RETURN n`

    return {
      query,
      params: {
        [uniqueIdField]: uniqueIdValue,
        props,
      },
    }
  } else {
    // CREATE query: create new node with all properties
    const query = `CREATE (n:${entityType}) SET n = $props RETURN n`

    return {
      query,
      params: {
        props,
      },
    }
  }
}
