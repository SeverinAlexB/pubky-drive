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

/** Chooses files in New › File upload, without waiting for the upload. */
async function chooseFiles(page: Page, names: string[]) {
  await page.getByRole('button', { name: 'New' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('menuitem', { name: 'File upload' }).click()
  await (
    await chooser
  ).setFiles(names.map((name) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(name) })))
}

/** The question before the first change to an app's files, by its title. */
function changeQuestion(page: Page, title: string) {
  return page.getByRole('dialog', { name: title })
}

async function grantManageAccess(page: Page) {
  await sidebar(page)
    .getByRole('link', { name: /Homeserver/ })
    .click()
  await page.getByRole('button', { name: 'Manage all files' }).click()
  await grantHomeserverAccess(page, 'Manage all files')
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
  await chooseFiles(page, ['other-app.json'])
  await changeQuestion(page, 'Change files at the top of /pub?')
    .getByRole('button', { name: 'Continue' })
    .click()
  await expect(row(page, 'other-app.json')).toBeVisible()

  await contextMenu(page, 'other-app.json', 'Organise', 'Move')
  const move = page.getByRole('dialog', { name: 'Move ‘other-app.json’' })
  await move.getByRole('tab', { name: 'Browse' }).click()
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

  await expect(row(page, 'bin')).toContainText('Bin')
  await expect(row(page, 'app')).toContainText('App data')
  await expect(row(page, 'files')).toContainText('Pubky Drive files')

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

test('manage access asks once per app before its files change, and never for Drive files', async ({
  page,
}) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [{ name: 'first.txt', text: 'f' }])
  await grantManageAccess(page)
  await sidebar(page).getByRole('link', { name: '/pub', exact: true }).click()
  // Browsing with Manage access shows no warning.
  await expect(page.getByRole('note')).toHaveCount(0)

  await page.keyboard.press('Shift+N')
  await changeQuestion(page, 'Change files at the top of /pub?')
    .getByRole('button', { name: 'Continue' })
    .click()
  await page.getByRole('textbox', { name: 'Name' }).fill('pubky.app')
  await page.getByRole('button', { name: 'Create' }).click()
  await row(page, 'pubky.app').dblclick()

  // Cancel changes nothing, and the question comes again next time.
  await chooseFiles(page, ['post.json'])
  const question = changeQuestion(page, 'Change pubky.app’s files?')
  await expect(question).toContainText('can break that app')
  await question.getByRole('button', { name: 'Cancel' }).click()
  await expect(question).toHaveCount(0)
  await expect(row(page, 'post.json')).toHaveCount(0)
  await chooseFiles(page, ['post.json'])
  await question.getByRole('button', { name: 'Continue' }).click()
  await expect(row(page, 'post.json')).toBeVisible()

  // Confirmed for this app until sign-out: renaming doesn't ask.
  await contextMenu(page, 'post.json', 'Rename')
  await page.getByRole('textbox', { name: 'Name' }).fill('renamed.json')
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(row(page, 'renamed.json')).toBeVisible()

  // The Drive's files, seen from the Homeserver section, never ask.
  await sidebar(page).getByRole('link', { name: '/priv', exact: true }).click()
  await row(page, 'pubky-drive').dblclick()
  await row(page, 'files').dblclick()
  await uploadFiles(page, [{ name: 'mine.txt', text: 'm' }])
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Pubky Drive's own data asks with its own words.
  await page
    .getByRole('navigation', { name: 'Folder path' })
    .getByRole('button', { name: 'pubky-drive' })
    .click()
  await row(page, 'files').click()
  await page.keyboard.press('F2')
  await expect(changeQuestion(page, 'Change Pubky Drive’s own data?')).toContainText(
    'can break the bin and starred items',
  )
})
