import { describe, it, expect } from 'vitest'

describe('Vitest Setup', () => {
  it('should run basic test', () => {
    const add = (a: number, b: number) => a + b
    expect(add(1, 2)).toBe(3)
  })

  it('should have access to globals', () => {
    expect(expect).toBeDefined()
    expect(describe).toBeDefined()
    expect(it).toBeDefined()
  })
})
