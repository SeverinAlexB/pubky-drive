import { expect, test } from '@playwright/test'
import { contextMenu, createFolder, openArea, row, signUp, uploadFiles } from './helpers'

test.beforeEach(async ({ page }) => {
  await signUp(page)
  await openArea(page, 'Private')
  await uploadFiles(page, [
    { name: 'report.txt', text: 'Quarterly report' },
    { name: 'notes.md', text: '# Notes' },
  ])
  await createFolder(page, 'Archive')
})

test('rename selects the whole name, as Drive does, and can be undone', async ({ page }) => {
  await contextMenu(page, 'report.txt', 'Rename')
  const field = page.getByRole('textbox', { name: 'Name' })
  await expect(field).toHaveValue('report.txt')
  expect(
    await field.evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd]),
  ).toEqual([0, 10])

  await field.fill('summary.txt')
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(row(page, 'summary.txt')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('‘report.txt’ renamed to ‘summary.txt’')

  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(row(page, 'report.txt')).toBeVisible()
  await expect(row(page, 'summary.txt')).toHaveCount(0)
})

test('rename refuses a name that exists', async ({ page }) => {
  await contextMenu(page, 'report.txt', 'Rename')
  await page.getByRole('textbox', { name: 'Name' }).fill('notes.md')
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(page.getByRole('dialog')).toContainText('An item named ‘notes.md’ already exists.')
})

test('make a copy, then move it with the move dialog', async ({ page }) => {
  await contextMenu(page, 'notes.md', 'Make a copy')
  await expect(row(page, 'Copy of notes.md')).toBeVisible()

  await contextMenu(page, 'Copy of notes.md', 'Organise', 'Move')
  const dialog = page.getByRole('dialog', { name: 'Move ‘Copy of notes.md’' })
  await expect(dialog).toContainText('Current location: Private')
  await dialog.getByRole('button', { name: 'Back' }).isDisabled()
  await dialog
    .getByRole('option', { name: /Private/ })
    .getByRole('button', { name: 'Open Private' })
    .click()
  await dialog.getByRole('option', { name: /Archive/ }).click()
  await expect(dialog).toContainText('Move to: Private › Archive')
  await dialog.getByRole('button', { name: 'Move' }).click()

  await expect(row(page, 'Copy of notes.md')).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('moved to ‘Private › Archive’')
  await row(page, 'Archive').dblclick()
  await expect(row(page, 'Copy of notes.md')).toBeVisible()
})

test('dragging a file onto a folder moves it', async ({ page }) => {
  await row(page, 'report.txt').dragTo(row(page, 'Archive'))
  await expect(row(page, 'report.txt')).toHaveCount(0)
  await row(page, 'Archive').dblclick()
  await expect(row(page, 'report.txt')).toBeVisible()
})

test('starred items appear in Starred and keep their star after a rename', async ({ page }) => {
  await contextMenu(page, 'notes.md', 'Organise', 'Add to starred')
  await expect(row(page, 'notes.md').getByLabel('Starred')).toBeVisible()

  await contextMenu(page, 'notes.md', 'Rename')
  await page.getByRole('textbox', { name: 'Name' }).fill('ideas.md')
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(row(page, 'ideas.md').getByLabel('Starred')).toBeVisible()

  await page.getByRole('link', { name: 'Starred' }).click()
  await expect(row(page, 'ideas.md')).toContainText('Private')
})

test('binned items can be restored, or deleted forever', async ({ page }) => {
  await row(page, 'report.txt').click()
  await page.keyboard.press('Delete')
  await expect(page.getByRole('status')).toContainText('‘report.txt’ moved to bin')
  await expect(row(page, 'report.txt')).toHaveCount(0)

  await contextMenu(page, 'notes.md', 'Move to bin')
  await page.getByRole('link', { name: 'Bin' }).click()
  await expect(row(page, 'report.txt')).toBeVisible()
  await expect(row(page, 'notes.md')).toBeVisible()
  await expect(page.getByText('Today', { exact: true })).toBeVisible()

  await contextMenu(page, 'report.txt', 'Restore')
  await expect(page.getByRole('status')).toContainText('‘report.txt’ restored')
  await expect(row(page, 'report.txt')).toHaveCount(0)

  await contextMenu(page, 'notes.md', 'Delete forever')
  await expect(page.getByRole('dialog', { name: 'Delete forever?' })).toContainText(
    '‘notes.md’ will be deleted forever.',
  )
  await page.getByRole('dialog').getByRole('button', { name: 'Delete forever' }).click()
  await expect(page.getByText('Nothing in the bin')).toBeVisible()

  await openArea(page, 'Private')
  await expect(row(page, 'report.txt')).toBeVisible()
  await expect(row(page, 'notes.md')).toHaveCount(0)
})

test('keyboard: arrows select, Enter opens a folder, Alt+Up goes back', async ({ page }) => {
  await page.getByRole('grid', { name: 'Items' }).click({ position: { x: 5, y: 5 } })
  await row(page, 'Archive').click()
  await page.keyboard.press('ArrowDown')
  await expect(row(page, 'notes.md')).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Shift+ArrowDown')
  await expect(page.getByRole('toolbar', { name: 'Selection actions' })).toContainText('2 selected')
  await page.keyboard.press('Escape')
  await row(page, 'Archive').click()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('navigation', { name: 'Folder path' })).toContainText('Archive')
  await page.getByText('Drop files here').click()
  await page.keyboard.press('Alt+ArrowUp')
  await expect(row(page, 'Archive')).toBeVisible()
})
