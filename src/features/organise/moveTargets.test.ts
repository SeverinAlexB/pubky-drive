import { expect, test } from 'vitest'
import { itemFromPath } from '../../drive/items'
import type { StoragePath } from '../../drive/paths'
import type { StorageEvent } from '../../pubky/events'
import { starredFolders, suggestedFolders } from './moveTargets'

const ROOT = '/priv/pubky-drive/files/'
const folder = (name: string) => itemFromPath(`${ROOT}${name}/` as StoragePath)
const event = (type: 'PUT' | 'DEL', path: string, cursor: number): StorageEvent => ({
  type,
  path: `${ROOT}${path}` as StoragePath,
  cursor: String(cursor),
})

test('suggests existing folders with the newest writes first, each once', () => {
  const folders = [folder('Photos'), folder('Work'), folder('Old')]
  const history = [
    event('PUT', 'Work/b.txt', 5),
    event('DEL', 'Old/x.txt', 4),
    event('PUT', 'Gone/y.txt', 3),
    event('PUT', 'Photos/a.png', 2),
    event('PUT', 'Work/a.txt', 1),
  ]

  const elsewhere = '/priv/pubky-drive/files/Elsewhere/' as StoragePath
  expect(suggestedFolders(history, folders, elsewhere).map((each) => each.name)).toEqual([
    'Work',
    'Photos',
  ])
  expect(suggestedFolders(history, folders, elsewhere, 1).map((each) => each.name)).toEqual([
    'Work',
  ])
})

test('fills up with the folders next to the moved items', () => {
  const folders = [
    folder('Photos'),
    folder('Work'),
    itemFromPath(`${ROOT}Work/Deep/` as StoragePath),
  ]
  const history = [event('PUT', 'Work/b.txt', 1)]

  expect(suggestedFolders(history, folders, ROOT).map((each) => each.name)).toEqual([
    'Work',
    'Photos',
  ])
  expect(suggestedFolders([], folders, ROOT).map((each) => each.name)).toEqual(['Photos', 'Work'])
})

test('lists starred folders that exist, by name', () => {
  const folders = [folder('Work'), folder('Photos')]
  const starred = new Set([
    `${ROOT}Work/`,
    `${ROOT}Photos/`,
    `${ROOT}a.txt`,
    `${ROOT}Gone/`,
  ] as StoragePath[])

  expect(starredFolders(starred, folders).map((each) => each.name)).toEqual(['Photos', 'Work'])
})
