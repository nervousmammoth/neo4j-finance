import { executeWriteTransaction } from './neo4j'
import type { ManagedTransaction } from 'neo4j-driver'

/**
 * Represents a single item in a batch operation
 */
export interface BatchItem {
  query: string
  params: Record<string, unknown>
}

/**
 * Options for batch execution
 */
export interface BatchOptions {
  /** Number of items to process per batch (default: 200) */
  batchSize?: number
  /** Maximum number of retry attempts for failed batches (default: 3) */
  maxRetries?: number
  /** Callback function to track batch progress */
  onProgress?: (progress: BatchProgress) => void
}

/**
 * Progress information for batch processing
 */
export interface BatchProgress {
  /** Current batch number (1-indexed) */
  currentBatch: number
  /** Total number of batches */
  totalBatches: number
  /** Number of items processed so far */
  itemsProcessed: number
  /** Total number of items to process */
  totalItems: number
}

/**
 * Result of batch execution
 *
 * Note: This function uses fail-fast error handling. If any batch fails
 * after exhausting retries, the function throws an error immediately.
 */
export interface BatchResult {
  /** Number of successfully processed items */
  succeeded: number
  /** Total number of batches processed */
  totalBatches: number
}

/**
 * Default configuration values
 */
const DEFAULT_BATCH_SIZE = 200
const DEFAULT_MAX_RETRIES = 3
const RETRY_DELAY_MS = 100 // Base delay for exponential backoff

/**
 * Split array into chunks of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Execute a single batch within a transaction
 *
 * Queries are executed in parallel for better performance, while still
 * maintaining transaction atomicity (all succeed or all rollback).
 */
async function executeSingleBatch(
  batch: BatchItem[],
  tx: ManagedTransaction
): Promise<void> {
  await Promise.all(batch.map((item) => tx.run(item.query, item.params)))
}

/**
 * Execute a batch of Neo4j queries with transaction management
 *
 * Uses fail-fast error handling: if any batch fails after exhausting retries,
 * the function throws immediately. Successfully processed batches are committed
 * before the error is thrown.
 *
 * @param items - Array of query/params objects to execute
 * @param options - Optional configuration for batch processing
 * @returns Promise resolving to batch execution results
 * @throws Error if any batch fails after exhausting retries
 *
 * @example
 * ```typescript
 * const items = [
 *   { query: 'CREATE (n:Person {id: $id})', params: { id: 1 } },
 *   { query: 'CREATE (n:Person {id: $id})', params: { id: 2 } },
 * ]
 *
 * const result = await executeBatch(items, {
 *   batchSize: 200,
 *   onProgress: (progress) => console.log(progress)
 * })
 * ```
 */
export async function executeBatch(
  items: BatchItem[],
  options?: BatchOptions
): Promise<BatchResult> {
  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES
  const onProgress = options?.onProgress

  // Validate input parameters
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error('batchSize must be a positive integer')
  }

  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new Error('maxRetries must be a non-negative integer')
  }

  // Handle empty input
  if (items.length === 0) {
    return {
      succeeded: 0,
      totalBatches: 0,
    }
  }

  // Split items into batches
  const batches = chunkArray(items, batchSize)
  const totalBatches = batches.length
  let processedItems = 0

  // Process each batch sequentially
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    let retryCount = 0
    let lastError: Error | null = null

    // Retry logic with exponential backoff
    while (retryCount <= maxRetries) {
      try {
        // Execute batch in a transaction
        await executeWriteTransaction(async (tx) => {
          await executeSingleBatch(batch, tx)
        })

        // Success - update progress
        processedItems += batch.length

        if (onProgress) {
          onProgress({
            currentBatch: batchIndex + 1,
            totalBatches,
            itemsProcessed: processedItems,
            totalItems: items.length,
          })
        }

        // Break out of retry loop on success
        break
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // If we've exhausted retries, fail-fast
        if (retryCount === maxRetries) {
          throw lastError
        }

        // Exponential backoff before retry
        retryCount++
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  // Return success result
  return {
    succeeded: processedItems,
    totalBatches: batches.length,
  }
}
