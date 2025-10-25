import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Neo4j Finance Frontend/i })).toBeVisible()
})
