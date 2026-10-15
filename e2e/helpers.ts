import { expect, type Page } from '@playwright/test'

export type AccessMode = 'Drive folder' | 'Entire homeserver'

/** Creates a disposable testnet identity with the development shortcut and signs in. */
export async function signUp(page: Page, mode: AccessMode = 'Drive folder') {
  await page.goto('/')
  await page.getByRole('radio', { name: new RegExp(mode) }).check()
  await page.getByRole('button', { name: 'Create identity and sign in' }).click()
  await expect(page.getByRole('navigation', { name: 'Folders and views' })).toBeVisible({
    timeout: 30_000,
  })
}

/** Opens an area or folder from the sidebar or the list. */
export async function openArea(page: Page, area: 'Public' | 'Private') {
  await page
    .getByRole('navigation', { name: 'Folders and views' })
    .getByRole('link', { name: area })
    .click()
  await expect(page.getByRole('navigation', { name: 'Folder path' })).toContainText(area)
}

export function row(page: Page, name: string) {
  return page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) })
}

/** Uploads in-memory files through New > File upload. */
export async function uploadFiles(page: Page, files: { name: string; text: string }[]) {
  await page.getByRole('button', { name: 'New' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('menuitem', { name: 'File upload' }).click()
  await (
    await chooser
  ).setFiles(
    files.map((file) => ({
      name: file.name,
      mimeType: 'text/plain',
      buffer: Buffer.from(file.text),
    })),
  )
  await expect(page.getByRole('region', { name: 'Uploads' })).toContainText(
    `${files.length} upload${files.length === 1 ? '' : 's'} complete`,
    { timeout: 30_000 },
  )
}

export async function createFolder(page: Page, name: string) {
  await page.getByRole('button', { name: 'New' }).click()
  await page.getByRole('menuitem', { name: 'New folder' }).click()
  const field = page.getByRole('textbox', { name: 'Name' })
  await field.fill(name)
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(row(page, name)).toBeVisible()
}

export async function contextMenu(page: Page, name: string, ...path: string[]) {
  await row(page, name).click({ button: 'right' })
  for (const [index, label] of path.entries()) {
    // Submenus render after their parent, so the last match is in the deepest open menu.
    const item = page.getByRole('menuitem', { name: label, exact: true }).last()
    if (index < path.length - 1) await item.hover()
    else await item.click()
  }
}
