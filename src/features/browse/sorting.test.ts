import { expect, test } from 'vitest'
import { itemFromPath, type DriveItem } from '../../drive/items'
import { sortItems } from './sorting'

const file = (name: string, sizeBytes?: number, modifiedMs?: number): DriveItem => ({
  ...itemFromPath(`/pub/${name}`),
  sizeBytes,
  modifiedMs,
})
const folder = (name: string) => itemFromPath(`/pub/${name}/`)

const items = [
  file('file 10.txt', 5, 3),
  folder('b'),
  file('file 2.txt', 50, 1),
  folder('A'),
  file('c.txt'),
]

test('sorts by name with natural numbers and folders first', () => {
  expect(
    sortItems(items, { key: 'name', ascending: true, foldersFirst: true }).map((item) => item.name),
  ).toEqual(['A', 'b', 'c.txt', 'file 2.txt', 'file 10.txt'])
})

test('sorts by size descending, with unknown sizes last', () => {
  expect(
    sortItems(items, { key: 'size', ascending: false, foldersFirst: false }).map(
      (item) => item.name,
    ),
  ).toEqual(['file 2.txt', 'file 10.txt', 'A', 'b', 'c.txt'])
})

test('sorts by modification time, keeping folders on top', () => {
  expect(
    sortItems(items, { key: 'modified', ascending: true, foldersFirst: true }).map(
      (item) => item.name,
    ),
  ).toEqual(['A', 'b', 'file 2.txt', 'file 10.txt', 'c.txt'])
})
