/**
 * Node Cypher Query Generator
 * Generates CREATE and MERGE Cypher queries for nodes with proper parameterization
 */

import { isValidNeo4jLabel } from './validators'

export interface GenerateNodeQueryOptions {
  merge?: boolean
  datasetId?: string
}

export interface GenerateNodeQueryResult {
  query: string
  params: Record<string, unknown>
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
 * Filters out undefined values from data object while preserving null values
 *
 * @param data - The input data object
 * @returns A new object with undefined values removed
 */
function filterUndefinedValues(
  data: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  )
}

/**
 * Prepares node properties by filtering undefined values and optionally adding dataset ID
 *
 * @param data - The raw property data
 * @param datasetId - Optional dataset identifier for namespacing
 * @returns Prepared properties ready for Cypher query
 */
function prepareNodeProperties(
  data: Record<string, unknown>,
  datasetId?: string
): Record<string, unknown> {
  const filteredData = filterUndefinedValues(data)
  return datasetId
    ? { ...filteredData, dataset_id: datasetId }
    : filteredData
}

/**
 * Builds a CREATE query for a new node
 *
 * @param entityType - The validated Neo4j label
 * @param props - The prepared node properties
 * @returns Query and parameters for CREATE operation
 */
function buildCreateQuery(
  entityType: string,
  props: Record<string, unknown>
): GenerateNodeQueryResult {
  return {
    query: `CREATE (n:${entityType}) SET n = $props RETURN n`,
    params: { props },
  }
}

/**
 * Builds a MERGE query for node upsert operation
 *
 * @param entityType - The validated Neo4j label
 * @param props - The prepared node properties
 * @returns Query and parameters for MERGE operation
 * @throws {Error} If entity type is unknown or unique identifier is missing
 */
function buildMergeQuery(
  entityType: string,
  props: Record<string, unknown>
): GenerateNodeQueryResult {
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

  return {
    query: `MERGE (n:${entityType} {${uniqueIdField}: $${uniqueIdField}}) SET n += $props RETURN n`,
    params: {
      [uniqueIdField]: uniqueIdValue,
      props,
    },
  }
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
  data: Record<string, unknown>,
  options?: GenerateNodeQueryOptions
): GenerateNodeQueryResult {
  // Validate entity type to prevent Cypher injection
  if (!entityType || !isValidNeo4jLabel(entityType)) {
    throw new Error(
      `Invalid Neo4j label: "${entityType}". Labels must start with a letter or underscore and contain only alphanumeric characters and underscores.`
    )
  }

  const { merge = false, datasetId } = options || {}

  // Prepare properties: filter undefined values and add dataset ID if provided
  const props = prepareNodeProperties(data, datasetId)

  // Generate appropriate query based on operation type
  return merge ? buildMergeQuery(entityType, props) : buildCreateQuery(entityType, props)
}
