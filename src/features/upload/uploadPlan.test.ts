import { expect, test } from 'vitest'
import { MemoryFileStore } from '../../drive/memoryFileStore'
import { DriveStorage } from '../../drive/storage'
import { planUploads } from './uploadPlan'

const ROOT = '/pub/pubky-drive/files/'

test('numbers taken top-level names and keeps folder structure', async () => {
  const files = new MemoryFileStore()
  files.seed(`${ROOT}a.txt`)
  files.seed(`${ROOT}photos/old.png`)
  const drive = new DriveStorage(files, files.ownerZ32)
  const file = new File(['x'], 'x')

  const plan = await planUploads(drive, ROOT, [
    { file, relativePath: 'a.txt' },
    { file, relativePath: 'b.txt' },
    { file, relativePath: 'photos/2026/new.png' },
    { file, relativePath: 'photos/other.png' },
  ])

  expect(plan.map((upload) => upload.target)).toEqual([
    `${ROOT}a (1).txt`,
    `${ROOT}b.txt`,
    `${ROOT}photos (1)/2026/new.png`,
    `${ROOT}photos (1)/other.png`,
  ])
})

test('names of uploads still running count as taken', async () => {
  const drive = new DriveStorage(new MemoryFileStore(), 'testowner')
  const file = new File(['x'], 'x')

  const plan = await planUploads(
    drive,
    ROOT,
    [
      { file, relativePath: 'big.txt' },
      { file, relativePath: 'photos/a.png' },
    ],
    [`${ROOT}big.txt`, `${ROOT}photos/b.png`, '/priv/elsewhere/big.txt'],
  )

  expect(plan.map((upload) => upload.target)).toEqual([
    `${ROOT}big (1).txt`,
    `${ROOT}photos (1)/a.png`,
  ])
})

test('rejects names the homeserver would change', async () => {
  const drive = new DriveStorage(new MemoryFileStore(), 'testowner')
  await expect(
    planUploads(drive, ROOT, [{ file: new File([], 'x'), relativePath: 'a\\b.txt' }]),
  ).rejects.toThrow('Can’t upload ‘a\\b.txt’')
})
