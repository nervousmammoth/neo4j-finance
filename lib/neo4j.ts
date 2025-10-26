import neo4j, { Driver, ManagedTransaction } from 'neo4j-driver'

let driver: Driver | null = null

export function getDriver(): Driver {
  if (driver) {
    return driver
  }

  const uri = process.env.NEO4J_URI
  const username = process.env.NEO4J_USERNAME
  const password = process.env.NEO4J_PASSWORD

  if (!uri) {
    throw new Error('NEO4J_URI is not defined')
  }
  if (!username) {
    throw new Error('NEO4J_USERNAME is not defined')
  }
  if (!password) {
    throw new Error('NEO4J_PASSWORD is not defined')
  }

  driver = neo4j.driver(
    uri,
    neo4j.auth.basic(username, password),
    {
      maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 60000, // 60 seconds
      maxTransactionRetryTime: 30000, // 30 seconds - automatic retry for transient errors
    }
  )

  return driver
}

export async function healthCheck(): Promise<boolean> {
  try {
    const driver = getDriver()
    const session = driver.session({
      database: process.env.NEO4J_DATABASE || 'neo4j',
    })

    try {
      await session.run('RETURN 1')
      return true
    } finally {
      await session.close()
    }
  } catch (error) {
    console.error('Health check failed:', error)
    return false
  }
}

export async function executeQuery<T = unknown>(
  query: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const driver = getDriver()
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
  })

  try {
    const result = await session.run(query, params)
    return result.records.map(record => record.toObject() as T)
  } finally {
    await session.close()
  }
}

/**
 * Execute a read transaction with automatic retry logic
 * Recommended for read operations in production
 */
export async function executeReadTransaction<T = unknown>(
  transactionWork: (tx: ManagedTransaction) => Promise<T>
): Promise<T> {
  const driver = getDriver()
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
  })

  try {
    return await session.executeRead(transactionWork)
  } finally {
    await session.close()
  }
}

/**
 * Execute a write transaction with automatic retry logic
 * Recommended for write operations in production
 */
export async function executeWriteTransaction<T = unknown>(
  transactionWork: (tx: ManagedTransaction) => Promise<T>
): Promise<T> {
  const driver = getDriver()
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
  })

  try {
    return await session.executeWrite(transactionWork)
  } finally {
    await session.close()
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close()
    driver = null
  }
}
