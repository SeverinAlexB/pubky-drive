import { expect, test, type Page } from '@playwright/test'
import { contextMenu, createFolder, openArea, row, signUp, uploadFiles } from './helpers'

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

test('binning a public folder with more files than the delete limit allows completes', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const requests = trackRequests(page)
  await signUp(page)
  await openArea(page, 'Public')
  await createFolder(page, 'Many')
  await row(page, 'Many').dblclick()
  await uploadFiles(
    page,
    Array.from({ length: 120 }, (_, index) => ({ name: `file-${index}.txt`, text: String(index) })),
  )
  await page
    .getByRole('navigation', { name: 'Folder path' })
    .getByRole('button', { name: 'Public' })
    .click()

  await row(page, 'Many').click()
  await page.keyboard.press('Delete')
  await expect(page.getByRole('status')).toContainText('‘Many’ moved to bin', { timeout: 90_000 })
  await expect(row(page, 'Many')).toHaveCount(0)

  // Deletes were paced below the homeserver's limit, so none was refused. (The event stream can
  // still meet the per-IP limit that the earlier tests used up; it retries on its own.)
  expect(requests.tooManyRequests.filter((url) => !url.includes('/events-stream'))).toEqual([])
})

test('a folder deleted elsewhere while open says so, instead of looking empty', async ({
  page,
  context,
}) => {
  await signUp(page)
  await openArea(page, 'Private')
  await createFolder(page, 'Temporary')
  const other = await context.newPage()
  await other.goto(page.url())
  await row(other, 'Temporary').dblclick()
  await expect(other.getByRole('navigation', { name: 'Folder path' })).toContainText('Temporary')

  await contextMenu(page, 'Temporary', 'Move to bin')
  await expect(other.getByText('This folder no longer exists')).toBeVisible({ timeout: 15_000 })
  await other.close()
})
