import { beforeEach, expect, test } from 'vitest'
import { itemFromPath } from '../../drive/items'
import { MemoryFileStore } from '../../drive/memoryFileStore'
import { DriveStorage } from '../../drive/storage'
import { deleteExpiredEntries, deleteForever, listBin, moveToBin, restoreFromBin } from './bin'

const ROOT = '/pub/pubky-drive/files/'
const ROOTS = [ROOT, '/priv/pubky-drive/files/'] as const
let files: MemoryFileStore
let drive: DriveStorage

beforeEach(() => {
  files = new MemoryFileStore()
  drive = new DriveStorage(files, files.ownerZ32)
})

test('binning a public file moves it into the private bin', async () => {
  files.seed(`${ROOT}photos/a.png`, 'png')

  const entry = await moveToBin(drive, itemFromPath(`${ROOT}photos/a.png`))

  expect(files.text(`${ROOT}photos/a.png`)).toBeUndefined()
  expect(files.text(entry.contentPath)).toBe('png')
  expect(entry.contentPath.startsWith('/priv/pubky-drive/bin/')).toBe(true)
  expect(await listBin(drive)).toEqual([entry])
})

test('restoring puts a folder back where it was', async () => {
  files.seed(`${ROOT}docs/a.txt`, 'a')
  files.seed(`${ROOT}docs/sub/b.txt`, 'b')
  const entry = await moveToBin(drive, itemFromPath(`${ROOT}docs/`))

  expect(await restoreFromBin(drive, entry, ROOTS)).toBe(`${ROOT}docs/`)
  expect(files.text(`${ROOT}docs/sub/b.txt`)).toBe('b')
  expect(files.paths().filter((path) => path.startsWith('/priv/'))).toEqual([])
})

test('restoring numbers the name when the original is taken again', async () => {
  files.seed(`${ROOT}a.txt`, 'old')
  const entry = await moveToBin(drive, itemFromPath(`${ROOT}a.txt`))
  files.seed(`${ROOT}a.txt`, 'new')

  expect(await restoreFromBin(drive, entry, ROOTS)).toBe(`${ROOT}a (1).txt`)
  expect(files.text(`${ROOT}a (1).txt`)).toBe('old')
})

test('deleting forever removes the entry and its content', async () => {
  files.seed(`${ROOT}a.txt`)
  const entry = await moveToBin(drive, itemFromPath(`${ROOT}a.txt`))
  await deleteForever(drive, entry)
  expect(await listBin(drive)).toEqual([])
  expect(files.paths()).toEqual([`${ROOT}.keep`])
})

test('expired entries are deleted, recent ones are kept', async () => {
  files.seed(`${ROOT}old.txt`)
  files.seed(`${ROOT}new.txt`)
  const old = await moveToBin(drive, itemFromPath(`${ROOT}old.txt`))
  const recent = await moveToBin(drive, itemFromPath(`${ROOT}new.txt`))
  const day = 24 * 60 * 60 * 1000

  expect(await deleteExpiredEntries(drive, old.binnedAtMs + 31 * day)).toBe(2)
  files.seed(`${ROOT}kept.txt`)
  const kept = await moveToBin(drive, itemFromPath(`${ROOT}kept.txt`))
  expect(await deleteExpiredEntries(drive, kept.binnedAtMs + 29 * day)).toBe(0)
  expect((await listBin(drive)).map((entry) => entry.name)).toEqual(['kept.txt'])
  expect(recent.name).toBe('new.txt')
})

test('restoring refuses an entry that points outside the session’s areas', async () => {
  files.seed('/priv/pubky-drive/files/secret.txt', 's')
  const entry = await moveToBin(drive, itemFromPath('/priv/pubky-drive/files/secret.txt'))
  const tampered = { ...entry, originalPath: '/pub/other-app/secret.txt' as const }

  await expect(restoreFromBin(drive, tampered, ROOTS)).rejects.toThrow('can’t be restored')
  expect(files.text(entry.contentPath)).toBe('s')
})

test('an empty bin lists nothing', async () => {
  expect(await listBin(drive)).toEqual([])
})
