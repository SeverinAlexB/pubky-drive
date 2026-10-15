import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { unzipSync } from 'fflate'
import { contextMenu, createFolder, openArea, row, signUp, uploadFiles } from './helpers'

function breadcrumb(page: Page) {
  return page.getByRole('navigation', { name: 'Folder path' })
}

/** A one-pixel PNG. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('folder upload keeps the folder structure', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'pubky-drive-upload-'))
  mkdirSync(join(root, 'Album', 'Day 1'), { recursive: true })
  writeFileSync(join(root, 'Album', 'cover.txt'), 'cover')
  writeFileSync(join(root, 'Album', 'Day 1', 'note.txt'), 'note')

  await signUp(page)
  await openArea(page, 'Private')
  await page.getByRole('button', { name: 'New' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('menuitem', { name: 'Folder upload' }).click()
  await (await chooser).setFiles(join(root, 'Album'))

  await expect(page.getByRole('region', { name: 'Uploads' })).toContainText('2 uploads complete')
  await row(page, 'Album').dblclick()
  await expect(row(page, 'cover.txt')).toBeVisible()
  await row(page, 'Day 1').dblclick()
  await expect(row(page, 'note.txt')).toContainText('4 bytes')
})

test('downloads a file as itself and a folder as a ZIP', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await createFolder(page, 'Docs')
  await row(page, 'Docs').dblclick()
  await uploadFiles(page, [{ name: 'a.txt', text: 'A' }])
  await breadcrumb(page).getByRole('button', { name: 'Private' }).click()

  const zipDownload = page.waitForEvent('download')
  await contextMenu(page, 'Docs', 'Download')
  const zip = await zipDownload
  expect(zip.suggestedFilename()).toBe('Docs.zip')
  expect(Object.keys(unzipSync(readFileSync(await zip.path())))).toEqual(['Docs/a.txt'])

  await row(page, 'Docs').dblclick()
  const fileDownload = page.waitForEvent('download')
  await contextMenu(page, 'a.txt', 'Download')
  const file = await fileDownload
  expect(file.suggestedFilename()).toBe('a.txt')
  expect(readFileSync(await file.path(), 'utf8')).toBe('A')
})

test('names with special characters work in folders, routes and renames', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  const name = '50% #1? ü'
  await createFolder(page, name)
  await row(page, name).dblclick()
  await expect(breadcrumb(page)).toContainText(name)
  await uploadFiles(page, [{ name: 'a&b=c.txt', text: 'x' }])

  await page.reload()
  await expect(breadcrumb(page)).toContainText(name)
  await expect(row(page, 'a&b=c.txt')).toBeVisible()

  await contextMenu(page, 'a&b=c.txt', 'Rename')
  await page.getByRole('textbox', { name: 'Name' }).fill('über: 100%.txt')
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(row(page, 'über: 100%.txt')).toBeVisible()
})

test('moving to the other area warns that it changes who can read the files', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [{ name: 'secret.txt', text: 's' }])
  await contextMenu(page, 'secret.txt', 'Organise', 'Move')
  const dialog = page.getByRole('dialog', { name: 'Move ‘secret.txt’' })
  await dialog.getByRole('tab', { name: 'Browse' }).click()
  await dialog.getByRole('option', { name: /^Public/ }).click()
  await expect(dialog).toContainText('These items will become public.')
  await dialog.getByRole('button', { name: 'Move' }).click()
  await openArea(page, 'Public')
  await expect(row(page, 'secret.txt')).toBeVisible()
})

test('undo reverses a copy and a move to bin', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [{ name: 'a.txt', text: 'a' }])

  await contextMenu(page, 'a.txt', 'Make a copy')
  await expect(row(page, 'Copy of a.txt')).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(row(page, 'Copy of a.txt')).toHaveCount(0)

  await contextMenu(page, 'a.txt', 'Move to bin')
  await expect(row(page, 'a.txt')).toHaveCount(0)
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(row(page, 'a.txt')).toBeVisible()
  await page.getByRole('link', { name: 'Bin' }).click()
  await expect(page.getByText('Nothing in the bin')).toBeVisible()
})

test('empty bin deletes every entry', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [
    { name: 'a.txt', text: 'a' },
    { name: 'b.txt', text: 'b' },
  ])
  await page.getByRole('grid', { name: 'Items' }).getByRole('row').nth(1).click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Delete')
  await expect(page.getByRole('status')).toContainText('2 items moved to bin')

  await page.getByRole('link', { name: 'Bin' }).click()
  await page.getByRole('button', { name: 'Empty bin' }).click()
  await page
    .getByRole('dialog', { name: 'Empty bin?' })
    .getByRole('button', { name: 'Empty bin' })
    .click()
  await expect(page.getByText('Nothing in the bin')).toBeVisible()
})

test('previews an image and a PDF', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await page.getByRole('button', { name: 'New' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('menuitem', { name: 'File upload' }).click()
  await (
    await chooser
  ).setFiles([
    { name: 'dot.png', mimeType: 'image/png', buffer: PNG },
    { name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') },
  ])
  await expect(page.getByRole('region', { name: 'Uploads' })).toContainText('2 uploads complete')

  await row(page, 'dot.png').dblclick()
  await expect(
    page.getByRole('dialog', { name: 'Preview of dot.png' }).getByRole('img', { name: 'dot.png' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await row(page, 'doc.pdf').dblclick()
  await expect(
    page.getByRole('dialog', { name: 'Preview of doc.pdf' }).locator('iframe'),
  ).toBeVisible()
})

test('deep folders collapse the middle of the breadcrumb', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  for (const name of ['one', 'two', 'three', 'four']) {
    await createFolder(page, name)
    await row(page, name).dblclick()
  }
  await expect(breadcrumb(page).getByRole('button', { name: '…' }).first()).toBeVisible()
  await expect(breadcrumb(page).getByRole('heading')).toHaveText('four')
})

test('right-clicking empty space opens the New menu for the folder', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [{ name: 'a.txt', text: 'a' }])
  await row(page, 'a.txt').click()

  const list = page.locator('.browser-list')
  const box = (await list.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 40, { button: 'right' })

  const menu = page.getByRole('menu', { name: 'Folder actions' })
  for (const label of ['New folder', 'File upload', 'Folder upload']) {
    await expect(menu.getByRole('menuitem', { name: label, exact: true })).toBeVisible()
  }
  await expect(menu.getByRole('menuitem')).toHaveCount(3)
  await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toHaveCount(0)
  await menu.getByRole('menuitem', { name: 'New folder' }).click()
  await expect(page.getByRole('dialog', { name: 'New folder' })).toBeVisible()
})

test('the Modified filter keeps only items changed in the chosen period', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await createFolder(page, 'Folder')
  await uploadFiles(page, [{ name: 'today.txt', text: 't' }])

  await page.getByRole('button', { name: 'Modified', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Last year (2025)' }).click()
  await expect(page.getByText('No items match these filters')).toBeVisible()

  await page.getByRole('button', { name: 'Last year (2025)' }).click()
  await page.getByRole('menuitem', { name: 'Today' }).click()
  await expect(row(page, 'today.txt')).toBeVisible()
  await expect(row(page, 'Folder')).toHaveCount(0)

  await page.getByRole('button', { name: 'Clear modified filter' }).click()
  await expect(row(page, 'Folder')).toBeVisible()
})

test('⇧ shortcuts create a folder, switch the layout and show details', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await page.keyboard.press('Shift+N')
  await expect(page.getByRole('dialog', { name: 'New folder' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.keyboard.press('Shift+L')
  await expect(page.getByRole('radio', { name: 'Grid layout' })).toBeChecked()
  await page.keyboard.press('Shift+L')
  await expect(page.getByRole('radio', { name: 'List layout' })).toBeChecked()

  await page.keyboard.press('Shift+D')
  await expect(page.getByRole('button', { name: 'Hide details' }).first()).toBeVisible()
})
