import { expect, test, type Page } from '@playwright/test'
import {
  contextMenu,
  createFolder,
  grantHomeserverAccess,
  openArea,
  row,
  signUp,
  uploadFiles,
} from './helpers'

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

test('view access browses the homeserver read-only, Drive folders included', async ({ page }) => {
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
  // The Drive folder stays in the Homeserver section, as raw storage.
  const path = page.getByRole('navigation', { name: 'Folder path' })
  await expect(path).toContainText('Homeserver/privpubky-drivefiles')
  await expect(page).toHaveURL(/#\/homeserver\/private\/pubky-drive\/files$/)
  await expect(row(page, 'drive-file.txt')).toBeVisible()
  await path.getByRole('button', { name: 'pubky-drive' }).click()
  await expect(path).toContainText('Homeserver/privpubky-drive')

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
  await move.getByRole('tab', { name: 'All locations' }).click()
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

test('the Homeserver section lists everything stored, with the app’s folders explained', async ({
  page,
}) => {
  await signUp(page)
  await openArea(page, 'Private')
  await createFolder(page, 'Empty')
  await uploadFiles(page, [{ name: 'binned.txt', text: 'b' }])
  await contextMenu(page, 'binned.txt', 'Move to bin')
  await expect(page.getByRole('status')).toContainText('moved to bin')

  await sidebar(page)
    .getByRole('link', { name: /Homeserver/ })
    .click()
  await page.getByRole('button', { name: 'Manage all files' }).click()
  await grantHomeserverAccess(page, 'Manage all files')
  await sidebar(page).getByRole('link', { name: '/priv', exact: true }).click()
  await row(page, 'pubky-drive').dblclick()

  await expect(
    page.getByRole('note').filter({ hasText: 'Pubky Drive manages this folder' }),
  ).toBeVisible()
  await expect(row(page, 'bin')).toContainText('Bin')
  await expect(row(page, 'app')).toContainText('App data')
  await expect(row(page, 'files')).toContainText('My Drive files')

  await row(page, 'files').dblclick()
  await row(page, 'Empty').dblclick()
  await expect(row(page, '.keep')).toContainText('Folder marker')
  await row(page, '.keep').click()
  await page.getByRole('button', { name: 'View details' }).click()
  await expect(page.getByText('Deleting it removes an empty folder.')).toBeVisible()

  await page
    .getByRole('navigation', { name: 'Folder path' })
    .getByRole('button', { name: 'pubky-drive' })
    .click()
  await row(page, 'bin').dblclick()
  await page.getByRole('grid', { name: 'Items' }).getByRole('row').nth(1).dblclick()
  await expect(row(page, 'entry.json')).toBeVisible()
  await row(page, 'content').dblclick()
  await expect(row(page, 'binned.txt')).toBeVisible()
  await expect(page).toHaveURL(/#\/homeserver\/private\/pubky-drive\/bin\/.+\/content$/)
})
