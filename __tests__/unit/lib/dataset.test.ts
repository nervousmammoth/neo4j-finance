import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateDatasetId,
  validateDatasetId,
  datasetExists,
} from '@/lib/dataset'

// Mock neo4j-driver
const mockRun = vi.fn()
const mockClose = vi.fn()
const mockSession = {
  run: mockRun,
  close: mockClose,
  executeRead: vi.fn(),
}
const mockDriver = {
  session: vi.fn(() => mockSession),
  close: vi.fn(),
}

vi.mock('neo4j-driver', () => ({
  default: {
    driver: vi.fn(() => mockDriver),
    auth: {
      basic: vi.fn((username, password) => ({ username, password })),
    },
  },
}))

// Mock environment variables
vi.stubEnv('NEO4J_URI', 'bolt://localhost:7687')
vi.stubEnv('NEO4J_USERNAME', 'neo4j')
vi.stubEnv('NEO4J_PASSWORD', 'password')
vi.stubEnv('NEO4J_DATABASE', 'neo4j')

describe('dataset utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateDatasetId', () => {
    it('should generate a dataset ID with custom name', () => {
      const id = generateDatasetId('transactions')
      expect(id).toMatch(/^transactions-\d{13}-[a-f0-9]{8}$/)
    })

    it('should generate a dataset ID without name (default)', () => {
      const id = generateDatasetId()
      expect(id).toMatch(/^dataset-\d{13}-[a-f0-9]{8}$/)
    })

    it('should generate unique IDs on multiple calls', () => {
      const id1 = generateDatasetId('test')
      const id2 = generateDatasetId('test')
      expect(id1).not.toBe(id2)
    })

    it('should slugify names with spaces', () => {
      const id = generateDatasetId('Bank Transactions')
      expect(id).toMatch(/^bank-transactions-\d{13}-[a-f0-9]{8}$/)
    })

    it('should slugify names with special characters', () => {
      const id = generateDatasetId('Test_Data@2024!')
      expect(id).toMatch(/^test-data-2024-\d{13}-[a-f0-9]{8}$/)
    })

    it('should handle uppercase names', () => {
      const id = generateDatasetId('TRANSACTIONS')
      expect(id).toMatch(/^transactions-\d{13}-[a-f0-9]{8}$/)
    })

    it('should remove consecutive hyphens', () => {
      const id = generateDatasetId('test---data___file')
      expect(id).toMatch(/^test-data-file-\d{13}-[a-f0-9]{8}$/)
    })

    it('should trim hyphens from start and end', () => {
      const id = generateDatasetId('--test-data--')
      expect(id).toMatch(/^test-data-\d{13}-[a-f0-9]{8}$/)
    })

    it('should handle empty string as name', () => {
      const id = generateDatasetId('')
      expect(id).toMatch(/^dataset-\d{13}-[a-f0-9]{8}$/)
    })

    it('should handle name with only special characters', () => {
      const id = generateDatasetId('!!!@@@###')
      expect(id).toMatch(/^dataset-\d{13}-[a-f0-9]{8}$/)
    })

    it('should generate timestamp in milliseconds', () => {
      const beforeTimestamp = Date.now()
      const id = generateDatasetId('test')
      const afterTimestamp = Date.now()

      const match = id.match(/^test-(\d{13})-[a-f0-9]{8}$/)
      expect(match).not.toBeNull()

      const timestamp = parseInt(match![1], 10)
      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp)
    })

    it('should use first 8 characters of UUID', () => {
      const id = generateDatasetId('test')
      const match = id.match(/^test-\d{13}-([a-f0-9]{8})$/)
      expect(match).not.toBeNull()
      expect(match![1]).toHaveLength(8)
    })
  })

  describe('validateDatasetId', () => {
    it('should validate correct dataset ID format', () => {
      const validId = 'transactions-1234567890123-abcd1234'
      expect(validateDatasetId(validId)).toBe(true)
    })

    it('should accept lowercase alphanumeric slug', () => {
      const validId = 'test123-1234567890123-abcd1234'
      expect(validateDatasetId(validId)).toBe(true)
    })

    it('should accept slug with hyphens', () => {
      const validId = 'test-data-set-1234567890123-abcd1234'
      expect(validateDatasetId(validId)).toBe(true)
    })

    it('should reject ID with uppercase letters in slug', () => {
      const invalidId = 'Transactions-1234567890123-abcd1234'
      expect(validateDatasetId(invalidId)).toBe(false)
    })

    it('should reject ID with uppercase letters in UUID', () => {
      const invalidId = 'transactions-1234567890123-ABCD1234'
      expect(validateDatasetId(invalidId)).toBe(false)
    })

    it('should reject ID with wrong timestamp length', () => {
      const invalidId = 'transactions-12345-abcd1234'
      expect(validateDatasetId(invalidId)).toBe(false)
    })

    it('should reject ID with wrong UUID length', () => {
      const invalidId = 'transactions-1234567890123-abcd'
      expect(validateDatasetId(invalidId)).toBe(false)
    })

    it('should reject ID missing parts', () => {
      expect(validateDatasetId('transactions-1234567890123')).toBe(false)
      expect(validateDatasetId('transactions')).toBe(false)
      expect(validateDatasetId('')).toBe(false)
    })

    it('should reject ID with invalid characters in UUID', () => {
      const invalidId = 'transactions-1234567890123-ghij1234'
      expect(validateDatasetId(invalidId)).toBe(false)
    })

    it('should reject ID with special characters in slug', () => {
      const invalidId = 'trans@ctions-1234567890123-abcd1234'
      expect(validateDatasetId(invalidId)).toBe(false)
    })
  })

  describe('datasetExists', () => {
    beforeEach(() => {
      mockSession.executeRead.mockClear()
    })

    it('should return true when dataset exists', async () => {
      mockSession.executeRead.mockImplementation(async (callback) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({
            records: [
              {
                get: (key: string) => (key === 'exists' ? true : undefined),
              },
            ],
          }),
        }
        return callback(mockTx)
      })

      const result = await datasetExists('test-1234567890123-abcd1234')
      expect(result).toBe(true)
    })

    it('should return false when dataset does not exist', async () => {
      mockSession.executeRead.mockImplementation(async (callback) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({
            records: [
              {
                get: (key: string) => (key === 'exists' ? false : undefined),
              },
            ],
          }),
        }
        return callback(mockTx)
      })

      const result = await datasetExists('nonexistent-1234567890123-abcd1234')
      expect(result).toBe(false)
    })

    it('should return false when no records found', async () => {
      mockSession.executeRead.mockImplementation(async (callback) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({
            records: [],
          }),
        }
        return callback(mockTx)
      })

      const result = await datasetExists('test-1234567890123-abcd1234')
      expect(result).toBe(false)
    })

    it('should use parameterized query for security', async () => {
      let capturedQuery = ''
      let capturedParams: Record<string, unknown> = {}

      mockSession.executeRead.mockImplementation(async (callback) => {
        const mockTx = {
          run: vi.fn().mockImplementation((query, params) => {
            capturedQuery = query
            capturedParams = params
            return Promise.resolve({
              records: [{ get: () => false }],
            })
          }),
        }
        return callback(mockTx)
      })

      await datasetExists('test-1234567890123-abcd1234')

      expect(capturedQuery).toContain('$datasetId')
      expect(capturedQuery).not.toContain('test-1234567890123-abcd1234')
      expect(capturedParams).toEqual({
        datasetId: 'test-1234567890123-abcd1234',
      })
    })

    it('should close session after operation', async () => {
      mockSession.executeRead.mockImplementation(async (callback) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({
            records: [{ get: () => true }],
          }),
        }
        return callback(mockTx)
      })

      await datasetExists('test-1234567890123-abcd1234')
      expect(mockClose).toHaveBeenCalled()
    })

    it('should close session even on error', async () => {
      mockSession.executeRead.mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(
        datasetExists('test-1234567890123-abcd1234')
      ).rejects.toThrow('Database connection failed')

      expect(mockClose).toHaveBeenCalled()
    })

    it('should handle Neo4j query errors', async () => {
      mockSession.executeRead.mockRejectedValue(new Error('Query failed'))

      await expect(
        datasetExists('test-1234567890123-abcd1234')
      ).rejects.toThrow('Query failed')
    })

    it('should use default database when NEO4J_DATABASE not set', async () => {
      const originalDb = process.env.NEO4J_DATABASE
      delete process.env.NEO4J_DATABASE

      mockSession.executeRead.mockImplementation(async (callback) => {
        const mockTx = {
          run: vi.fn().mockResolvedValue({
            records: [{ get: () => true }],
          }),
        }
        return callback(mockTx)
      })

      await datasetExists('test-1234567890123-abcd1234')

      expect(mockDriver.session).toHaveBeenCalledWith({
        database: 'neo4j',
      })

      // Restore original value
      if (originalDb) {
        process.env.NEO4J_DATABASE = originalDb
      }
    })
  })
})
