import { expect, test, type Page } from '@playwright/test'
import { createFolder, openArea, row, signUp, uploadFiles } from './helpers'

// The production homeserver allows 1 event-stream request per second per IP (burst 5). Run the
// testnet with e2e/homeserver-rate-limited.toml for these tests to be meaningful. Tests that share
// the limit run one after another, because every browser here has the same IP.
test.describe.configure({ mode: 'serial' })

/** Counts homeserver requests by endpoint, and the 429 responses among them. */
function trackRequests(page: Page) {
  const counts = { eventStream: 0, tooManyRequests: [] as string[] }
  page.on('response', (response) => {
    const url = response.url()
    if (url.includes('/events-stream')) counts.eventStream++
    if (response.status() === 429) counts.tooManyRequests.push(url.replace(/\?.*/, ''))
  })
  return counts
}

test('browsing folders and views stays within the event-stream rate limit', async ({ page }) => {
  const requests = trackRequests(page)
  await signUp(page)
  await openArea(page, 'Private')
  await createFolder(page, 'One')
  await createFolder(page, 'Two')
  await uploadFiles(page, [{ name: 'a.txt', text: 'a' }])

  for (let round = 0; round < 3; round++) {
    await row(page, 'One').dblclick()
    await expect(page.getByRole('navigation', { name: 'Folder path' })).toContainText('One')
    await page
      .getByRole('navigation', { name: 'Folder path' })
      .getByRole('button', { name: 'Private' })
      .click()
    await row(page, 'Two').dblclick()
    await expect(page.getByRole('navigation', { name: 'Folder path' })).toContainText('Two')
    await openArea(page, 'Public')
    await page.getByRole('link', { name: 'Recent' }).click()
    await expect(row(page, 'a.txt')).toBeVisible()
    await openArea(page, 'Private')
  }

  expect(requests.tooManyRequests).toEqual([])
  // One history request and one live stream for the whole session, plus Recent's history once.
  expect(requests.eventStream).toBeLessThanOrEqual(4)
})

test('a change made in another tab appears in the open folder', async ({ page, context }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await createFolder(page, 'Shared')

  const other = await context.newPage()
  await other.goto(page.url())
  await expect(row(other, 'Shared')).toBeVisible()
  await createFolder(page, 'Made elsewhere')
  await expect(row(other, 'Made elsewhere')).toBeVisible({ timeout: 15_000 })
  await other.close()
})
