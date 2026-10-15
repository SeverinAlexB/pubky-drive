import { expect, test } from 'vitest'
import type { StoragePath } from '../../drive/paths'
import { MemoryFileStore } from '../../drive/memoryFileStore'
import { followMove, forgetRemoved, loadStarred, saveStarred } from './starred'

const starred = new Set<StoragePath>(['/pub/a.txt', '/pub/docs/', '/pub/docs/b.txt', '/priv/c.txt'])

test('starred paths round-trip through the app data file', async () => {
  const files = new MemoryFileStore()
  expect(await loadStarred(files)).toEqual(new Set())
  await saveStarred(files, starred)
  expect(await loadStarred(files)).toEqual(starred)
})

test('moving a starred folder moves the stars inside it', () => {
  expect(followMove(starred, '/pub/docs/', '/priv/docs/')).toEqual(
    new Set(['/pub/a.txt', '/priv/docs/', '/priv/docs/b.txt', '/priv/c.txt']),
  )
})

test('removing a folder removes the stars inside it', () => {
  expect(forgetRemoved(starred, '/pub/docs/')).toEqual(new Set(['/pub/a.txt', '/priv/c.txt']))
})
