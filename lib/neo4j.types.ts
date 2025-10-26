export interface Neo4jConfig {
  uri: string
  username: string
  password: string
  database?: string
}

export interface QueryResult<T = unknown> {
  records: T[]
  summary: {
    query: string
    parameters: Record<string, unknown>
  }
}
