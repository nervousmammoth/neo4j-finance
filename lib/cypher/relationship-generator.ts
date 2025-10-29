/**
 * Relationship Cypher Query Generator
 * Generates CREATE and MERGE Cypher queries for relationships with proper parameterization
 */

import { isValidNeo4jLabel } from './validators'

export interface NodeIdentifier {
  entityType: string
  [key: string]: unknown
}

export interface GenerateRelationshipQueryOptions {
  merge?: boolean
  datasetId?: string
  properties?: Record<string, unknown>
}

export interface GenerateRelationshipQueryResult {
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
 * Gets the unique identifier field name for an entity type
 *
 * @param entityType - The entity type label
 * @returns The unique identifier field name
 * @throws {Error} If entity type is unknown
 */
function getUniqueIdentifierField(entityType: string): string {
  const uniqueIdField = UNIQUE_IDENTIFIERS[entityType]

  if (!uniqueIdField) {
    throw new Error(
      `Unknown entity type: "${entityType}". Cannot determine unique identifier.`
    )
  }

  return uniqueIdField
}

/**
 * Extracts the identifier value from a node object
 *
 * @param node - The node identifier object
 * @param uniqueIdField - The expected unique identifier field name
 * @returns The identifier value
 * @throws {Error} If identifier is missing
 */
function extractNodeIdentifier(
  node: NodeIdentifier,
  uniqueIdField: string
): unknown {
  const identifierValue = node[uniqueIdField]

  if (identifierValue === undefined) {
    throw new Error(
      `Missing required identifier "${uniqueIdField}" for ${node.entityType}`
    )
  }

  return identifierValue
}

/**
 * Prepares relationship properties by filtering undefined values and optionally adding dataset ID
 *
 * @param properties - The raw relationship property data
 * @param datasetId - Optional dataset identifier for namespacing
 * @returns Prepared properties ready for Cypher query, or undefined if no properties
 */
function prepareRelationshipProperties(
  properties: Record<string, unknown> | undefined,
  datasetId?: string
): Record<string, unknown> | undefined {
  if (!properties || Object.keys(properties).length === 0) {
    return datasetId ? { dataset_id: datasetId } : undefined
  }

  const filteredProps = filterUndefinedValues(properties)
  const hasProps = Object.keys(filteredProps).length > 0

  if (!hasProps && !datasetId) {
    return undefined
  }

  return datasetId
    ? { ...filteredProps, dataset_id: datasetId }
    : filteredProps
}

/**
 * Builds MATCH clauses for source and target nodes
 *
 * @param sourceNode - The source node identifier
 * @param targetNode - The target node identifier
 * @param fromIdField - The unique identifier field for source node
 * @param toIdField - The unique identifier field for target node
 * @returns MATCH clauses for both nodes
 */
function buildMatchClauses(
  sourceNode: NodeIdentifier,
  targetNode: NodeIdentifier,
  fromIdField: string,
  toIdField: string
): string {
  const fromMatch = `MATCH (from:${sourceNode.entityType} {${fromIdField}: $fromId})`
  const toMatch = `MATCH (to:${targetNode.entityType} {${toIdField}: $toId})`
  return `${fromMatch}\n${toMatch}`
}

/**
 * Builds a CREATE query for a new relationship
 *
 * @param relationshipType - The validated relationship type
 * @param matchClauses - The MATCH clauses for nodes
 * @param props - The prepared relationship properties
 * @returns Query and parameters for CREATE operation
 */
function buildCreateRelationshipQuery(
  relationshipType: string,
  matchClauses: string,
  props: Record<string, unknown> | undefined,
  fromId: unknown,
  toId: unknown
): GenerateRelationshipQueryResult {
  const createClause = `CREATE (from)-[r:${relationshipType}]->(to)`
  const setClause = props ? '\nSET r = $props' : ''
  const returnClause = '\nRETURN r'

  const query = `${matchClauses}\n${createClause}${setClause}${returnClause}`

  const params: Record<string, unknown> = {
    fromId,
    toId,
  }

  if (props) {
    params.props = props
  }

  return { query, params }
}

/**
 * Builds a MERGE query for relationship upsert operation
 *
 * @param relationshipType - The validated relationship type
 * @param matchClauses - The MATCH clauses for nodes
 * @param props - The prepared relationship properties
 * @returns Query and parameters for MERGE operation
 */
function buildMergeRelationshipQuery(
  relationshipType: string,
  matchClauses: string,
  props: Record<string, unknown> | undefined,
  fromId: unknown,
  toId: unknown
): GenerateRelationshipQueryResult {
  const mergeClause = `MERGE (from)-[r:${relationshipType}]->(to)`
  const setClause = props ? '\nSET r += $props' : ''
  const returnClause = '\nRETURN r'

  const query = `${matchClauses}\n${mergeClause}${setClause}${returnClause}`

  const params: Record<string, unknown> = {
    fromId,
    toId,
  }

  if (props) {
    params.props = props
  }

  return { query, params }
}

/**
 * Generate a Cypher CREATE or MERGE query for a relationship
 *
 * @param relationshipType - The Neo4j relationship type (e.g., "OWNS", "HELD_AT")
 * @param sourceNode - Object with entityType and identifier for source node
 * @param targetNode - Object with entityType and identifier for target node
 * @param options - Optional configuration
 * @returns An object containing the Cypher query and parameters
 *
 * @throws {Error} If validation fails
 */
export function generateRelationshipQuery(
  relationshipType: string,
  sourceNode: NodeIdentifier,
  targetNode: NodeIdentifier,
  options?: GenerateRelationshipQueryOptions
): GenerateRelationshipQueryResult {
  // Validate relationship type to prevent Cypher injection
  if (!relationshipType || !isValidNeo4jLabel(relationshipType)) {
    throw new Error(
      `Invalid Neo4j relationship type: "${relationshipType}". Relationship types must start with a letter or underscore and contain only alphanumeric characters and underscores.`
    )
  }

  // Validate source node label
  if (!sourceNode.entityType || !isValidNeo4jLabel(sourceNode.entityType)) {
    throw new Error(
      `Invalid Neo4j label: "${sourceNode.entityType}". Labels must start with a letter or underscore and contain only alphanumeric characters and underscores.`
    )
  }

  // Validate target node label
  if (!targetNode.entityType || !isValidNeo4jLabel(targetNode.entityType)) {
    throw new Error(
      `Invalid Neo4j label: "${targetNode.entityType}". Labels must start with a letter or underscore and contain only alphanumeric characters and underscores.`
    )
  }

  const { merge = false, datasetId, properties } = options || {}

  // Get unique identifier fields for both nodes
  const fromIdField = getUniqueIdentifierField(sourceNode.entityType)
  const toIdField = getUniqueIdentifierField(targetNode.entityType)

  // Extract identifier values
  const fromId = extractNodeIdentifier(sourceNode, fromIdField)
  const toId = extractNodeIdentifier(targetNode, toIdField)

  // Prepare relationship properties
  const props = prepareRelationshipProperties(properties, datasetId)

  // Build MATCH clauses
  const matchClauses = buildMatchClauses(
    sourceNode,
    targetNode,
    fromIdField,
    toIdField
  )

  // Generate appropriate query based on operation type
  return merge
    ? buildMergeRelationshipQuery(relationshipType, matchClauses, props, fromId, toId)
    : buildCreateRelationshipQuery(relationshipType, matchClauses, props, fromId, toId)
}
