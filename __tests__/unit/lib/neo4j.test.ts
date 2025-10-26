import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDriver, healthCheck, executeQuery, closeDriver } from '@/lib/neo4j'

// Create mock functions for session
const mockRun = vi.fn()
const mockClose = vi.fn()

// Create mock session
const mockSession = {
  run: mockRun,
  close: mockClose,
}

// Create mock driver
const mockDriverClose = vi.fn()
const mockDriverSession = vi.fn(() => mockSession)
const mockDriver = {
  session: mockDriverSession,
  close: mockDriverClose,
}

// Mock neo4j-driver
vi.mock('neo4j-driver', () => ({
  default: {
    driver: vi.fn(() => mockDriver),
    auth: {
      basic: vi.fn((username, password) => ({ username, password })),
    },
  },
}))

describe('Neo4j Connection Manager', () => {
  // Set up environment variables before all tests
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment variables
    process.env = {
      ...originalEnv,
      NEO4J_URI: 'bolt://localhost:7687',
      NEO4J_USERNAME: 'neo4j',
      NEO4J_PASSWORD: 'password',
      NEO4J_DATABASE: 'neo4j',
    }

    // Clear all mocks
    vi.clearAllMocks()

    // Reset mock implementations
    mockRun.mockResolvedValue({
      records: [
        {
          toObject: () => ({ num: 1 }),
        },
      ],
    })
    mockClose.mockResolvedValue(undefined)
    mockDriverClose.mockResolvedValue(undefined)
  })

  afterEach(async () => {
    await closeDriver()
    process.env = originalEnv
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

    it('should throw error with invalid URI', async () => {
      // Need to close driver first to reset the singleton
      await closeDriver()
      process.env.NEO4J_URI = ''
      expect(() => getDriver()).toThrow('NEO4J_URI is not defined')
    })

    it('should throw error with missing username', async () => {
      await closeDriver()
      process.env.NEO4J_USERNAME = ''
      expect(() => getDriver()).toThrow('NEO4J_USERNAME is not defined')
    })

    it('should throw error with missing password', async () => {
      await closeDriver()
      process.env.NEO4J_PASSWORD = ''
      expect(() => getDriver()).toThrow('NEO4J_PASSWORD is not defined')
    })
  })

  describe('healthCheck', () => {
    it('should return true when database is accessible', async () => {
      const result = await healthCheck()
      expect(result).toBe(true)
    })

    it('should return false when database is unreachable', async () => {
      // Need to close driver and reset to trigger new connection
      await closeDriver()

      // Mock connection failure
      mockRun.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await healthCheck()
      expect(result).toBe(false)
    })
  })

  describe('executeQuery', () => {
    it('should execute query successfully', async () => {
      const result = await executeQuery('RETURN 1 as num')
      expect(result).toBeDefined()
    })

    it('should use default database when NEO4J_DATABASE is not set', async () => {
      delete process.env.NEO4J_DATABASE
      const result = await executeQuery('RETURN 1 as num')
      expect(result).toBeDefined()
      expect(mockDriverSession).toHaveBeenCalledWith({ database: 'neo4j' })
    })

    it('should handle query errors', async () => {
      // Mock query error
      mockRun.mockRejectedValueOnce(new Error('Invalid query syntax'))

      await expect(executeQuery('INVALID QUERY')).rejects.toThrow('Invalid query syntax')
    })
  })

  describe('closeDriver', () => {
    it('should close driver connections cleanly', async () => {
      const driver = getDriver()
      await closeDriver()
      expect(mockDriverClose).toHaveBeenCalledTimes(1)
    })
  })
})
