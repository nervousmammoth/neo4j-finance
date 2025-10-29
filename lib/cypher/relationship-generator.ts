/**
 * Relationship Cypher Query Generator
 * Generates CREATE and MERGE Cypher queries for relationships with proper parameterization
 */

import {
  filterUndefinedValues,
  getUniqueIdentifierField,
  validateNeo4jIdentifier,
} from './utils'

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
  // Filter undefined values from properties if provided
  const filteredProps = properties ? filterUndefinedValues(properties) : {}
  const hasProps = Object.keys(filteredProps).length > 0

  // Return undefined if no properties and no dataset ID
  if (!hasProps && !datasetId) {
    return undefined
  }

  // Return properties with optional dataset_id
  return datasetId ? { ...filteredProps, dataset_id: datasetId } : filteredProps
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
  validateNeo4jIdentifier(relationshipType, 'relationship type')

  // Validate source and target node labels
  validateNeo4jIdentifier(sourceNode.entityType, 'label')
  validateNeo4jIdentifier(targetNode.entityType, 'label')

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
