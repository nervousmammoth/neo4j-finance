import { v4 as uuidv4 } from 'uuid'
import { getDriver } from './neo4j'

/**
 * Converts a string to a URL-friendly slug format
 * @param text - The text to slugify
 * @returns A lowercase slug with hyphens
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .replace(/^-+|-+$/g, '') // Trim hyphens from start and end
}

/**
 * Generates a unique dataset ID with the format: {slug}-{timestamp}-{uuid8}
 * @param name - Optional name to include in the ID (will be slugified)
 * @returns A unique dataset ID string
 * @example
 * generateDatasetId('Bank Transactions') // => 'bank-transactions-1234567890123-a1b2c3d4'
 * generateDatasetId() // => 'dataset-1234567890123-a1b2c3d4'
 */
export function generateDatasetId(name?: string): string {
  const slug = name && name.trim() ? slugify(name) : 'dataset'
  const timestamp = Date.now() // 13-digit millisecond timestamp
  const uuid = uuidv4().replace(/-/g, '').substring(0, 8) // First 8 chars of UUID

  // Handle empty slug after slugification
  const finalSlug = slug || 'dataset'

  return `${finalSlug}-${timestamp}-${uuid}`
}

/**
 * Validates a dataset ID format
 * Expected format: {slug}-{timestamp}-{uuid8}
 * - slug: lowercase alphanumeric with hyphens
 * - timestamp: exactly 13 digits
 * - uuid8: exactly 8 hexadecimal characters (lowercase)
 *
 * @param id - The dataset ID to validate
 * @returns True if the ID matches the expected format, false otherwise
 * @example
 * validateDatasetId('transactions-1234567890123-abcd1234') // => true
 * validateDatasetId('Invalid-ID') // => false
 */
export function validateDatasetId(id: string): boolean {
  const pattern = /^[a-z0-9-]+-\d{13}-[a-f0-9]{8}$/
  return pattern.test(id)
}

/**
 * Checks if a dataset exists in the Neo4j database
 * Uses a parameterized query to prevent Cypher injection
 *
 * @param id - The dataset ID to check
 * @returns True if at least one node with the dataset_id exists, false otherwise
 * @throws Error if the database query fails
 * @example
 * await datasetExists('transactions-1234567890123-abcd1234') // => true or false
 */
export async function datasetExists(id: string): Promise<boolean> {
  const driver = getDriver()
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
  })

  try {
    const result = await session.executeRead(async (tx) => {
      const queryResult = await tx.run(
        'MATCH (n {dataset_id: $datasetId}) RETURN count(n) > 0 AS exists LIMIT 1',
        { datasetId: id }
      )

      if (queryResult.records.length === 0) {
        return false
      }

      return queryResult.records[0].get('exists')
    })

    return result
  } finally {
    await session.close()
  }
}
