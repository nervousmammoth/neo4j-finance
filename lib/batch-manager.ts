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
 */
export interface BatchResult {
  /** Number of successfully processed items */
  succeeded: number
  /** Number of failed items */
  failed: number
  /** Total number of batches processed */
  totalBatches: number
  /** Array of errors encountered */
  errors: BatchError[]
}

/**
 * Error information for a failed batch
 */
export interface BatchError {
  /** Index of the failed batch */
  batchIndex: number
  /** Items that failed */
  items: BatchItem[]
  /** The error that occurred */
  error: Error
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
 */
async function executeSingleBatch(
  batch: BatchItem[],
  tx: ManagedTransaction
): Promise<void> {
  for (const item of batch) {
    await tx.run(item.query, item.params)
  }
}

/**
 * Execute a batch of Neo4j queries with transaction management
 *
 * @param items - Array of query/params objects to execute
 * @param options - Optional configuration for batch processing
 * @returns Promise resolving to batch execution results
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

  // Handle empty input
  if (items.length === 0) {
    return {
      succeeded: 0,
      failed: 0,
      totalBatches: 0,
      errors: [],
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
    failed: 0,
    totalBatches: batches.length,
    errors: [],
  }
}
