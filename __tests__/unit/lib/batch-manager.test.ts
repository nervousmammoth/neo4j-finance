import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { BatchItem, BatchOptions } from '@/lib/batch-manager'

// Mock the neo4j module
const mockExecuteWriteTransaction = vi.fn()

vi.mock('@/lib/neo4j', () => ({
  executeWriteTransaction: mockExecuteWriteTransaction,
}))

// Import after mock is set up
const { executeBatch } = await import('@/lib/batch-manager')

describe('Batch Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('executeBatch - basic batching', () => {
    it('should successfully process 200 items in one batch', async () => {
      // Create 200 items
      const items: BatchItem[] = Array.from({ length: 200 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      // Mock successful transaction
      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({
            records: [],
          }),
        }
        return await fn(mockTx)
      })

      const result = await executeBatch(items)

      expect(result.succeeded).toBe(200)
      expect(result.totalBatches).toBe(1)
      expect(mockExecuteWriteTransaction).toHaveBeenCalledTimes(1)
    })

    it('should successfully process 500 items in multiple batches', async () => {
      // Create 500 items (should be 3 batches: 200, 200, 100)
      const items: BatchItem[] = Array.from({ length: 500 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({
            records: [],
          }),
        }
        return await fn(mockTx)
      })

      const result = await executeBatch(items)

      expect(result.succeeded).toBe(500)
      expect(result.totalBatches).toBe(3)
      expect(mockExecuteWriteTransaction).toHaveBeenCalledTimes(3)
    })

    it('should handle empty input array', async () => {
      const items: BatchItem[] = []

      const result = await executeBatch(items)

      expect(result.succeeded).toBe(0)
      expect(result.totalBatches).toBe(0)
      expect(mockExecuteWriteTransaction).not.toHaveBeenCalled()
    })

    it('should process single item correctly', async () => {
      const items: BatchItem[] = [
        {
          query: `CREATE (n:Test {id: $id})`,
          params: { id: 1 },
        },
      ]

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({
            records: [],
          }),
        }
        return await fn(mockTx)
      })

      const result = await executeBatch(items)

      expect(result.succeeded).toBe(1)
      expect(result.totalBatches).toBe(1)
      expect(mockExecuteWriteTransaction).toHaveBeenCalledTimes(1)
    })

    it('should support custom batch size', async () => {
      const items: BatchItem[] = Array.from({ length: 250 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({
            records: [],
          }),
        }
        return await fn(mockTx)
      })

      // Use batch size of 100 instead of default 200
      const result = await executeBatch(items, { batchSize: 100 })

      expect(result.succeeded).toBe(250)
      expect(result.totalBatches).toBe(3) // 100, 100, 50
      expect(mockExecuteWriteTransaction).toHaveBeenCalledTimes(3)
    })
  })

  describe('executeBatch - error handling', () => {
    it('should stop on first batch failure (fail-fast)', async () => {
      const items: BatchItem[] = Array.from({ length: 400 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      const persistentError = new Error('Transaction failed')

      // First batch succeeds, second batch fails all attempts (initial + 3 retries)
      mockExecuteWriteTransaction
        .mockImplementationOnce(async (fn) => {
          const mockTx = {
            run: vi.fn().mockResolvedValue({ records: [] }),
          }
          return await fn(mockTx)
        })
        .mockRejectedValueOnce(persistentError) // Initial attempt
        .mockRejectedValueOnce(persistentError) // Retry 1
        .mockRejectedValueOnce(persistentError) // Retry 2
        .mockRejectedValueOnce(persistentError) // Retry 3

      await expect(executeBatch(items)).rejects.toThrow('Transaction failed')

      // Should attempt: 1 success + 4 failures (initial + 3 retries) = 5 total
      expect(mockExecuteWriteTransaction).toHaveBeenCalledTimes(5)
    })

    it('should rollback entire batch on error within transaction', async () => {
      const items: BatchItem[] = Array.from({ length: 5 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi
            .fn()
            .mockResolvedValueOnce({ records: [] })
            .mockResolvedValueOnce({ records: [] })
            .mockRejectedValueOnce(new Error('Query failed')),
        }
        // Transaction function should throw, causing rollback
        return await fn(mockTx)
      })

      await expect(executeBatch(items)).rejects.toThrow('Query failed')
    })

    it('should include detailed error information', async () => {
      const items: BatchItem[] = Array.from({ length: 200 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      const testError = new Error('Database connection lost')
      mockExecuteWriteTransaction.mockRejectedValue(testError)

      try {
        await executeBatch(items)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBe(testError)
        expect((error as Error).message).toBe('Database connection lost')
      }
    })

    it('should handle non-Error thrown values', async () => {
      const items: BatchItem[] = Array.from({ length: 10 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      // Throw a string instead of an Error object
      mockExecuteWriteTransaction.mockRejectedValue('Something went wrong')

      try {
        await executeBatch(items, { maxRetries: 0 })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Something went wrong')
      }
    })
  })

  describe('executeBatch - retry logic', () => {
    it('should retry failed batch with transient errors', async () => {
      const items: BatchItem[] = Array.from({ length: 10 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      // Fail once, then succeed
      mockExecuteWriteTransaction
        .mockRejectedValueOnce(
          new Error('ServiceUnavailable: Connection temporarily unavailable')
        )
        .mockImplementation(async (fn) => {
          const mockTx = {
            run: vi.fn().mockResolvedValue({ records: [] }),
          }
          return await fn(mockTx)
        })

      const result = await executeBatch(items, { maxRetries: 3 })

      expect(result.succeeded).toBe(10)
      // Called twice: 1 failure + 1 retry success
      expect(mockExecuteWriteTransaction).toHaveBeenCalledTimes(2)
    })

    it('should stop after max retry attempts', async () => {
      const items: BatchItem[] = Array.from({ length: 10 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      const persistentError = new Error('Constraint violation')
      mockExecuteWriteTransaction.mockRejectedValue(persistentError)

      await expect(executeBatch(items, { maxRetries: 3 })).rejects.toThrow(
        'Constraint violation'
      )

      // Should try: 1 initial + 3 retries = 4 total
      expect(mockExecuteWriteTransaction).toHaveBeenCalledTimes(4)
    })

    it('should handle connection loss and recovery', async () => {
      const items: BatchItem[] = Array.from({ length: 50 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      // Simulate connection loss then recovery
      mockExecuteWriteTransaction
        .mockRejectedValueOnce(new Error('Neo.ClientError.Database.DatabaseUnavailable'))
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockImplementation(async (fn) => {
          const mockTx = {
            run: vi.fn().mockResolvedValue({ records: [] }),
          }
          return await fn(mockTx)
        })

      const result = await executeBatch(items, { maxRetries: 5 })

      expect(result.succeeded).toBe(50)
      expect(mockExecuteWriteTransaction).toHaveBeenCalledTimes(3)
    })
  })

  describe('executeBatch - progress tracking', () => {
    it('should call progress callback after each batch', async () => {
      const items: BatchItem[] = Array.from({ length: 450 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({ records: [] }),
        }
        return await fn(mockTx)
      })

      const progressCallback = vi.fn()
      const options: BatchOptions = {
        onProgress: progressCallback,
      }

      await executeBatch(items, options)

      // Should be called 3 times (for 3 batches of 200, 200, 50)
      expect(progressCallback).toHaveBeenCalledTimes(3)

      // Check first callback
      expect(progressCallback).toHaveBeenNthCalledWith(1, {
        currentBatch: 1,
        totalBatches: 3,
        itemsProcessed: 200,
        totalItems: 450,
      })

      // Check second callback
      expect(progressCallback).toHaveBeenNthCalledWith(2, {
        currentBatch: 2,
        totalBatches: 3,
        itemsProcessed: 400,
        totalItems: 450,
      })

      // Check third callback
      expect(progressCallback).toHaveBeenNthCalledWith(3, {
        currentBatch: 3,
        totalBatches: 3,
        itemsProcessed: 450,
        totalItems: 450,
      })
    })

    it('should not call progress callback if not provided', async () => {
      const items: BatchItem[] = Array.from({ length: 200 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({ records: [] }),
        }
        return await fn(mockTx)
      })

      // Should not throw even without progress callback
      const result = await executeBatch(items)

      expect(result.succeeded).toBe(200)
    })
  })

  describe('executeBatch - memory management', () => {
    it('should not load all results into memory', async () => {
      // Create large dataset (1000 items)
      const items: BatchItem[] = Array.from({ length: 1000 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({
            records: [], // Empty records array
          }),
        }
        return await fn(mockTx)
      })

      const result = await executeBatch(items)

      // Should process all items without memory issues
      expect(result.succeeded).toBe(1000)
      expect(result.totalBatches).toBe(5) // 200 * 5
      expect(mockExecuteWriteTransaction).toHaveBeenCalledTimes(5)
    })
  })

  describe('executeBatch - transaction timeout', () => {
    it('should handle Neo4j transaction timeout', async () => {
      const items: BatchItem[] = Array.from({ length: 100 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      mockExecuteWriteTransaction.mockRejectedValue(
        new Error('Neo.TransientError.Transaction.TransactionTimedOut')
      )

      await expect(executeBatch(items)).rejects.toThrow('TransactionTimedOut')
    })
  })

  describe('executeBatch - edge cases', () => {
    it('should handle queries with complex parameters', async () => {
      const items: BatchItem[] = [
        {
          query: `CREATE (n:Person {props: $props})`,
          params: {
            props: {
              name: 'John Doe',
              age: 30,
              emails: ['john@example.com', 'doe@example.com'],
              metadata: { verified: true, score: 9.5 },
            },
          },
        },
      ]

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({ records: [] }),
        }
        return await fn(mockTx)
      })

      const result = await executeBatch(items)

      expect(result.succeeded).toBe(1)
      expect(mockExecuteWriteTransaction).toHaveBeenCalledTimes(1)
    })

    it('should handle batch with mixed query types', async () => {
      const items: BatchItem[] = [
        {
          query: `CREATE (n:Person {id: $id})`,
          params: { id: 1 },
        },
        {
          query: `CREATE (a:Account {iban: $iban})`,
          params: { iban: 'DE89370400440532013000' },
        },
        {
          query: `MATCH (p:Person {id: $pid}), (a:Account {iban: $iban}) CREATE (p)-[:OWNS]->(a)`,
          params: { pid: 1, iban: 'DE89370400440532013000' },
        },
      ]

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({ records: [] }),
        }
        return await fn(mockTx)
      })

      const result = await executeBatch(items)

      expect(result.succeeded).toBe(3)
      expect(result.totalBatches).toBe(1)
    })
  })

  describe('executeBatch - input validation', () => {
    it('should reject zero batchSize', async () => {
      const items: BatchItem[] = [
        { query: 'CREATE (n:Test {id: $id})', params: { id: 1 } },
      ]

      await expect(executeBatch(items, { batchSize: 0 })).rejects.toThrow(
        'batchSize must be a positive integer'
      )
    })

    it('should reject negative batchSize', async () => {
      const items: BatchItem[] = [
        { query: 'CREATE (n:Test {id: $id})', params: { id: 1 } },
      ]

      await expect(executeBatch(items, { batchSize: -10 })).rejects.toThrow(
        'batchSize must be a positive integer'
      )
    })

    it('should reject non-integer batchSize', async () => {
      const items: BatchItem[] = [
        { query: 'CREATE (n:Test {id: $id})', params: { id: 1 } },
      ]

      await expect(executeBatch(items, { batchSize: 10.5 })).rejects.toThrow(
        'batchSize must be a positive integer'
      )
    })

    it('should reject negative maxRetries', async () => {
      const items: BatchItem[] = [
        { query: 'CREATE (n:Test {id: $id})', params: { id: 1 } },
      ]

      await expect(executeBatch(items, { maxRetries: -1 })).rejects.toThrow(
        'maxRetries must be a non-negative integer'
      )
    })

    it('should reject non-integer maxRetries', async () => {
      const items: BatchItem[] = [
        { query: 'CREATE (n:Test {id: $id})', params: { id: 1 } },
      ]

      await expect(executeBatch(items, { maxRetries: 3.7 })).rejects.toThrow(
        'maxRetries must be a non-negative integer'
      )
    })

    it('should accept zero maxRetries (no retries)', async () => {
      const items: BatchItem[] = [
        { query: 'CREATE (n:Test {id: $id})', params: { id: 1 } },
      ]

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({ records: [] }),
        }
        return await fn(mockTx)
      })

      const result = await executeBatch(items, { maxRetries: 0 })
      expect(result.succeeded).toBe(1)
    })
  })

  describe('executeBatch - parallel execution', () => {
    it('should execute all queries in batch concurrently', async () => {
      const items: BatchItem[] = Array.from({ length: 5 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      const mockRun = vi.fn().mockResolvedValue({ records: [] })

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = { run: mockRun }
        return await fn(mockTx)
      })

      await executeBatch(items)

      // All 5 queries should have been called
      expect(mockRun).toHaveBeenCalledTimes(5)

      // Verify each query was called with correct parameters
      for (let i = 0; i < 5; i++) {
        expect(mockRun).toHaveBeenCalledWith(
          'CREATE (n:Test {id: $id})',
          { id: i }
        )
      }
    })

    it('should rollback entire batch if any query fails during parallel execution', async () => {
      const items: BatchItem[] = Array.from({ length: 5 }, (_, i) => ({
        query: `CREATE (n:Test {id: $id})`,
        params: { id: i },
      }))

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          run: vi
            .fn()
            .mockResolvedValueOnce({ records: [] })
            .mockResolvedValueOnce({ records: [] })
            .mockRejectedValueOnce(new Error('Query 3 failed'))
            .mockResolvedValueOnce({ records: [] })
            .mockResolvedValueOnce({ records: [] }),
        }
        return await fn(mockTx)
      })

      await expect(executeBatch(items)).rejects.toThrow('Query 3 failed')
    })

    it('should maintain transaction atomicity with parallel execution', async () => {
      const items: BatchItem[] = [
        { query: 'CREATE (p:Person {id: $id})', params: { id: 1 } },
        { query: 'CREATE (a:Account {id: $id})', params: { id: 2 } },
        {
          query: 'MATCH (p:Person {id: $pid}), (a:Account {id: $aid}) CREATE (p)-[:OWNS]->(a)',
          params: { pid: 1, aid: 2 },
        },
      ]

      const mockRun = vi.fn().mockResolvedValue({ records: [] })

      mockExecuteWriteTransaction.mockImplementation(async (fn) => {
        const mockTx = { run: mockRun }
        return await fn(mockTx)
      })

      const result = await executeBatch(items)

      // All queries should succeed together
      expect(result.succeeded).toBe(3)
      expect(mockRun).toHaveBeenCalledTimes(3)
    })
  })
})
