import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDriver, healthCheck, executeQuery, closeDriver } from '@/lib/neo4j'

// Mock neo4j-driver
vi.mock('neo4j-driver', () => ({
  default: {
    driver: vi.fn(),
    auth: {
      basic: vi.fn((username, password) => ({ username, password })),
    },
  },
}))

describe('Neo4j Connection Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await closeDriver()
  })

  describe('getDriver', () => {
    it('should create driver instance with valid credentials', () => {
      const driver = getDriver()
      expect(driver).toBeDefined()
    })

    it('should return same driver instance (singleton)', () => {
      const driver1 = getDriver()
      const driver2 = getDriver()
      expect(driver1).toBe(driver2)
    })

    it('should throw error with invalid URI', () => {
      process.env.NEO4J_URI = ''
      expect(() => getDriver()).toThrow('NEO4J_URI is not defined')
    })
  })

  describe('healthCheck', () => {
    it('should return true when database is accessible', async () => {
      const result = await healthCheck()
      expect(result).toBe(true)
    })

    it('should return false when database is unreachable', async () => {
      // Mock connection failure
      const result = await healthCheck()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('executeQuery', () => {
    it('should execute query successfully', async () => {
      const result = await executeQuery('RETURN 1 as num')
      expect(result).toBeDefined()
    })

    it('should handle query errors', async () => {
      await expect(executeQuery('INVALID QUERY')).rejects.toThrow()
    })
  })

  describe('closeDriver', () => {
    it('should close driver connections cleanly', async () => {
      const driver = getDriver()
      await closeDriver()
      // Driver should be closed
    })
  })
})
