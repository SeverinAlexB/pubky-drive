import { expect, test, type Page } from '@playwright/test'
import { grantHomeserverAccess, openArea, row, signUp } from './helpers'

/** Starts uploading in-memory files through New > File upload, without waiting for them. */
async function startUpload(page: Page, files: { name: string; bytes: number }[]) {
  await page.getByRole('button', { name: 'New' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('menuitem', { name: 'File upload' }).click()
  await (
    await chooser
  ).setFiles(
    files.map((file) => ({
      name: file.name,
      mimeType: 'text/plain',
      buffer: Buffer.alloc(file.bytes, 'x'),
    })),
  )
}

test('uploading the same name twice while the first upload runs keeps both files', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await signUp(page)
  await openArea(page, 'Private')

  // Large enough to still be uploading when the second upload is planned.
  await startUpload(page, [{ name: 'big.txt', bytes: 25_000_000 }])
  await expect(page.getByRole('region', { name: 'Uploads' })).toContainText('Uploading')
  await startUpload(page, [{ name: 'big.txt', bytes: 10 }])

  await expect(row(page, 'big (1).txt')).toContainText('10 bytes', { timeout: 90_000 })
  await expect(row(page, 'big.txt')).toContainText('24 MB', { timeout: 90_000 })
})

test('signing out in one tab signs out the other tabs', async ({ page, context }) => {
  await signUp(page)
  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByRole('heading', { name: 'Pubky Drive' })).toBeVisible()

  await page.getByRole('button', { name: /^Account/ }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()

  await expect(other.getByRole('heading', { name: 'Sign in with Pubky Ring' })).toBeVisible({
    timeout: 10_000,
  })
  await other.close()
})

test('changing access in one tab updates the other tabs', async ({ page, context }) => {
  await signUp(page)
  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByRole('link', { name: /Homeserver/ })).toContainText('No access')

  await page.getByRole('link', { name: /Homeserver/ }).click()
  await page.getByRole('button', { name: 'View all files' }).click()
  await grantHomeserverAccess(page, 'View all files')

  await expect(other.getByRole('link', { name: /Homeserver/ })).toContainText('View only', {
    timeout: 10_000,
  })
  await openArea(other, 'Private')
  await expect(other.getByText('Drop files here')).toBeVisible()
  await other.close()
})
