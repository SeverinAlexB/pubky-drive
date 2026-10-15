import { expect, test } from '@playwright/test'
import { contextMenu, createFolder, openArea, row, signUp, uploadFiles } from './helpers'

test('making a file public gives a link that opens without signing in', async ({
  page,
  browser,
}) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [{ name: 'plan ü.txt', text: 'The plan, in public.' }])

  await contextMenu(page, 'plan ü.txt', 'Share', 'Share')
  const share = page.getByRole('dialog', { name: 'Share ‘plan ü.txt’' })
  await expect(share.getByRole('button', { name: 'Copy link' })).toBeDisabled()
  await share.getByRole('radio', { name: /Public/ }).click()
  await page
    .getByRole('dialog', { name: 'Make ‘plan ü.txt’ public?' })
    .getByRole('button', { name: 'Make public' })
    .click()
  await expect(page.getByRole('status')).toContainText('‘plan ü.txt’ is now public')
  await expect(row(page, 'plan ü.txt')).toHaveCount(0)

  await openArea(page, 'Public')
  await contextMenu(page, 'plan ü.txt', 'Share', 'Copy link')
  await expect(page.getByRole('status')).toContainText('Link copied')
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toMatch(/#\/view\/pubky[a-z0-9]{52}\/pub\/pubky-drive\/files\/plan%20%C3%BC\.txt$/)

  const visitor = await browser.newPage()
  await visitor.goto(link)
  await expect(visitor.getByRole('dialog', { name: 'Preview of plan ü.txt' })).toContainText(
    'The plan, in public.',
  )
  await visitor.getByRole('button', { name: 'Close preview' }).click()
  await expect(visitor.getByRole('button', { name: /plan ü\.txt/ })).toBeVisible()
  await visitor.close()
})

test('the viewer refuses private addresses', async ({ browser }) => {
  const visitor = await browser.newPage()
  await visitor.goto('/#/view/pubky8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo/priv/x.txt')
  await expect(visitor.getByText('This file isn’t available.')).toBeVisible()
  await visitor.close()
})

test('preview shows text and moves between files with the arrow keys', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [
    { name: 'a.txt', text: 'First file' },
    { name: 'b.txt', text: 'Second file' },
  ])
  await row(page, 'a.txt').dblclick()
  const preview = page.getByRole('dialog', { name: 'Preview of a.txt' })
  await expect(preview).toContainText('First file')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('dialog', { name: 'Preview of b.txt' })).toContainText('Second file')
  await page.keyboard.press('Escape')
  await expect(row(page, 'b.txt')).toHaveAttribute('aria-selected', 'true')
})

test('search suggests matches and lists results with their location', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await createFolder(page, 'Café')
  await row(page, 'Café').dblclick()
  await uploadFiles(page, [{ name: 'Menu.txt', text: 'Soup' }])
  await openArea(page, 'Public')
  await uploadFiles(page, [{ name: 'menu-public.txt', text: 'Bread' }])

  const search = page.getByRole('combobox', { name: 'Search Pubky Drive' })
  await search.fill('cafe')
  await expect(page.getByRole('listbox', { name: 'Suggestions' })).toContainText('Café')
  await search.fill('menu')
  await search.press('Enter')
  await expect(page.getByRole('heading', { name: 'Search results' })).toBeVisible()
  await expect(row(page, 'Menu.txt')).toContainText('Private › Café')
  await expect(row(page, 'menu-public.txt')).toContainText('Public')
})

test('recent lists the latest changes first', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [{ name: 'older.txt', text: '1' }])
  await openArea(page, 'Public')
  await uploadFiles(page, [{ name: 'newer.txt', text: '2' }])

  await page.getByRole('link', { name: 'Recent' }).click()
  await expect(page.getByText('Today', { exact: true })).toBeVisible()
  const names = page
    .getByRole('row')
    .filter({ has: page.getByRole('gridcell') })
    .locator('.file-name-text')
  await expect(names).toHaveText(['newer.txt', 'older.txt'])
})

test('details pane shows where a file is and who can read it', async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Public')
  await uploadFiles(page, [{ name: 'photo-notes.txt', text: 'abc' }])
  await row(page, 'photo-notes.txt').click()
  await page.getByRole('button', { name: 'View details' }).click()

  const details = page.getByRole('complementary', { name: 'Details' })
  await expect(details).toContainText('Public: anyone with the address')
  await expect(details).toContainText('/pub/pubky-drive/files/photo-notes.txt')
  await expect(details).toContainText('3 bytes')
})
