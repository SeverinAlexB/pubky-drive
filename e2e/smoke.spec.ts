import { expect, test } from '@playwright/test'
import { createFolder, openArea, row, signUp, uploadFiles } from './helpers'

test('signing up shows My Drive with both areas', async ({ page }) => {
  await signUp(page)
  await expect(page.getByRole('heading', { name: 'My Drive' })).toBeVisible()
  await expect(row(page, 'Public')).toBeVisible()
  await expect(row(page, 'Private')).toBeVisible()
  await page.screenshot({ path: 'test-results/screens/my-drive.png' })
})

test('files uploaded into a new folder are listed with their sizes', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await expect(page.getByText('Drop files here')).toBeVisible()
  await createFolder(page, 'Notes')
  await row(page, 'Notes').dblclick()
  await uploadFiles(page, [
    { name: 'hello.txt', text: 'Hello from Pubky Drive.' },
    { name: 'a b ü.md', text: '# Title' },
  ])
  await expect(row(page, 'hello.txt')).toContainText('23 bytes')
  await expect(row(page, 'a b ü.md')).toContainText('7 bytes')
  await page.screenshot({ path: 'test-results/screens/folder.png' })
})
