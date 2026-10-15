import { expect, test, type Page } from '@playwright/test'
import { contextMenu, grantHomeserverAccess, openArea, row, signUp, uploadFiles } from './helpers'

function sidebar(page: Page) {
  return page.getByRole('navigation', { name: 'Folders and views' })
}

test('sign-in asks only for the Drive folder; the Homeserver section asks for more', async ({
  page,
}) => {
  await signUp(page)
  await expect(sidebar(page).getByRole('link', { name: /Homeserver/ })).toContainText('No access')

  await sidebar(page)
    .getByRole('link', { name: /Homeserver/ })
    .click()
  await expect(page.getByRole('heading', { name: 'Browse your whole homeserver' })).toBeVisible()
  await page.getByRole('button', { name: 'View all files' }).click()
  await expect(page.getByRole('dialog', { name: 'What Pubky Drive can access' })).toBeVisible()
})

test('view access browses the homeserver read-only and keeps Public and Private on the Drive', async ({
  page,
}) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [{ name: 'drive-file.txt', text: 'mine' }])

  await sidebar(page)
    .getByRole('link', { name: /Homeserver/ })
    .click()
  await page.getByRole('button', { name: 'View all files' }).click()
  await grantHomeserverAccess(page, 'View all files')
  await expect(sidebar(page).getByRole('link', { name: /Homeserver/ })).toContainText('View only')

  await sidebar(page).getByRole('link', { name: '/priv', exact: true }).click()
  await expect(page.getByRole('note')).toContainText('View only')
  await expect(row(page, 'pubky-drive')).toContainText('Pubky Drive')
  await row(page, 'pubky-drive').dblclick()
  await row(page, 'files').dblclick()
  // The Drive folder opens in My Drive, not as raw storage.
  await expect(page.getByRole('navigation', { name: 'Folder path' })).toContainText('My Drive')
  await expect(row(page, 'drive-file.txt')).toBeVisible()

  await page
    .getByRole('navigation', { name: 'Folder path' })
    .getByRole('button', { name: 'My Drive' })
    .click()
  await openArea(page, 'Private')
  await expect(row(page, 'drive-file.txt')).toBeVisible()
})

test('manage access changes other apps’ files, and moving them into the Drive asks first', async ({
  page,
}) => {
  await signUp(page)
  await sidebar(page)
    .getByRole('link', { name: /Homeserver/ })
    .click()
  await page.getByRole('button', { name: 'Manage all files' }).click()
  await grantHomeserverAccess(page, 'Manage all files')

  await sidebar(page).getByRole('link', { name: '/pub', exact: true }).click()
  await uploadFiles(page, [{ name: 'other-app.json', text: '{}' }])
  await expect(row(page, 'other-app.json')).toBeVisible()

  await contextMenu(page, 'other-app.json', 'Organise', 'Move')
  const move = page.getByRole('dialog', { name: 'Move ‘other-app.json’' })
  await move.getByRole('option', { name: /^Private/ }).click()
  await move.getByRole('button', { name: 'Move' }).click()
  const confirm = page.getByRole('dialog', { name: 'Move into your Drive?' })
  await expect(confirm).toContainText('won’t find it any more')
  await confirm.getByRole('button', { name: 'Move' }).click()
  await expect(row(page, 'other-app.json')).toHaveCount(0)

  await openArea(page, 'Private')
  await expect(row(page, 'other-app.json')).toBeVisible()
})

test('view access disables changes to homeserver files', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [{ name: 'x.txt', text: 'x' }])
  await sidebar(page)
    .getByRole('link', { name: /Homeserver/ })
    .click()
  await page.getByRole('button', { name: 'View all files' }).click()
  await grantHomeserverAccess(page, 'View all files')
  await sidebar(page).getByRole('link', { name: '/priv', exact: true }).click()

  await row(page, 'pubky-drive').click({ button: 'right' })
  await expect(page.getByRole('menuitem', { name: 'Rename', exact: true })).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: 'Move to bin', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'New' })).toBeEnabled()
})
