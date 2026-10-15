import { beforeEach, describe, expect, test } from 'vitest'
import { NameTakenError, PartialOperationError } from './errors'
import { itemFromPath } from './items'
import { MemoryFileStore } from './memoryFileStore'
import { copyItem, createFolder, deleteItem, moveItem, renameItem } from './operations'
import { DriveStorage } from './storage'

const ROOT = '/pub/pubky-drive/files/'
let files: MemoryFileStore
let drive: DriveStorage

beforeEach(() => {
  files = new MemoryFileStore()
  drive = new DriveStorage(files, files.ownerZ32, ['/priv/pubky-drive/bin/'])
})

describe('listFolder', () => {
  test('shows folders and files with metadata, and hides folder markers', async () => {
    files.seed(`${ROOT}My File ü.txt`, 'hello')
    files.seed(`${ROOT}photos/2026/a.png`)
    files.seed(`${ROOT}empty/.keep`)
    files.seed(`${ROOT}.keep`)

    const items = await drive.listFolder(ROOT)

    expect(items.map((item) => [item.kind, item.name, item.sizeBytes])).toEqual([
      ['file', 'My File ü.txt', 5],
      ['folder', 'empty', undefined],
      ['folder', 'photos', undefined],
    ])
  })

  test('treats a missing folder as empty, but can tell it apart', async () => {
    files.seed(`${ROOT}empty/.keep`)
    expect(await drive.listFolder(`${ROOT}missing/`)).toEqual([])
    expect(await drive.listFolderIfExists(`${ROOT}missing/`)).toBeUndefined()
    expect(await drive.listFolderIfExists(`${ROOT}empty/`)).toEqual([])
  })

  test('hides the app data folders', async () => {
    files.seed('/priv/pubky-drive/bin/x/entry.json')
    files.seed('/priv/notes.txt')
    expect((await drive.listFolder('/priv/pubky-drive/')).map((item) => item.name)).toEqual([])
    expect((await drive.listFolder('/priv/')).map((item) => item.name)).toEqual([
      'notes.txt',
      'pubky-drive',
    ])
  })

  test('reads every page of a large folder', async () => {
    for (let index = 0; index < 250; index++)
      files.seed(`${ROOT}f${String(index).padStart(3, '0')}.txt`)
    expect(await drive.listFolder(ROOT)).toHaveLength(250)
  })
})

describe('createFolder', () => {
  test('creates an empty folder with a marker', async () => {
    const folder = await createFolder(drive, ROOT, 'Untitled folder')
    expect(folder).toBe(`${ROOT}Untitled folder/`)
    expect(files.paths()).toEqual([`${ROOT}Untitled folder/.keep`])
  })

  test('refuses a name that exists', async () => {
    files.seed(`${ROOT}docs/a.txt`)
    await expect(createFolder(drive, ROOT, 'docs')).rejects.toBeInstanceOf(NameTakenError)
  })

  test('refuses an invalid name', async () => {
    await expect(createFolder(drive, ROOT, 'a\\b')).rejects.toThrow('Names can’t contain / or \\.')
  })
})

describe('copyItem', () => {
  test('copies a folder tree under a new name', async () => {
    files.seed(`${ROOT}a/x.txt`, 'x')
    files.seed(`${ROOT}a/sub/y.txt`, 'y')

    const target = await copyItem(drive, itemFromPath(`${ROOT}a/`), ROOT, 'Copy of a')

    expect(target).toBe(`${ROOT}Copy of a/`)
    expect(files.text(`${ROOT}Copy of a/sub/y.txt`)).toBe('y')
    expect(files.text(`${ROOT}a/x.txt`)).toBe('x')
  })

  test('numbers the copy when the name is taken', async () => {
    files.seed(`${ROOT}n.md`, '#')
    files.seed(`${ROOT}Copy of n.md`, '#')
    expect(await copyItem(drive, itemFromPath(`${ROOT}n.md`), ROOT, 'Copy of n.md')).toBe(
      `${ROOT}Copy of n (1).md`,
    )
  })
})

describe('moveItem', () => {
  test('moves a file and keeps the folder it left', async () => {
    files.seed(`${ROOT}photos/a.png`, 'png')

    const target = await moveItem(
      drive,
      itemFromPath(`${ROOT}photos/a.png`),
      ROOT,
      'a.png',
      'number',
    )

    expect(target).toBe(`${ROOT}a.png`)
    expect(files.paths()).toEqual([`${ROOT}a.png`, `${ROOT}photos/.keep`])
  })

  test('moves between areas', async () => {
    files.seed(`${ROOT}secret.txt`, 's')
    await moveItem(
      drive,
      itemFromPath(`${ROOT}secret.txt`),
      '/priv/pubky-drive/files/',
      'secret.txt',
      'fail',
    )
    expect(files.text('/priv/pubky-drive/files/secret.txt')).toBe('s')
    expect(files.text(`${ROOT}secret.txt`)).toBeUndefined()
  })

  test('refuses to move a folder into itself', async () => {
    files.seed(`${ROOT}a/b/c.txt`)
    await expect(
      moveItem(drive, itemFromPath(`${ROOT}a/`), `${ROOT}a/b/`, 'a', 'number'),
    ).rejects.toThrow('A folder can’t be moved into itself.')
  })

  test('refuses a target name that exists when numbering is off', async () => {
    files.seed(`${ROOT}a/1.txt`, '1')
    files.seed(`${ROOT}target`)
    const move = moveItem(drive, itemFromPath(`${ROOT}a/`), ROOT, 'target', 'fail')
    await expect(move).rejects.toBeInstanceOf(NameTakenError)
    expect(files.text(`${ROOT}a/1.txt`)).toBe('1')
  })

  test('stops at a failing file, keeps it, and reports how many files moved', async () => {
    files.seed(`${ROOT}a/1.txt`, '1')
    files.seed(`${ROOT}a/2.txt`, '2')
    files.seed(`${ROOT}a/3.txt`, '3')
    const putBytes = files.putBytes.bind(files)
    files.putBytes = async (path, body) => {
      if (path.endsWith('/2.txt'))
        throw Object.assign(new Error('507'), { data: { statusCode: 507 } })
      return putBytes(path, body)
    }
    const progress: number[] = []

    const error = await moveItem(drive, itemFromPath(`${ROOT}a/`), ROOT, 'b', 'fail', (done) =>
      progress.push(done),
    ).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(PartialOperationError)
    expect((error as PartialOperationError).message).toBe(
      'Moved 1 of 3. Couldn’t continue with ‘2.txt’: Your homeserver storage is full.',
    )
    expect(progress).toEqual([0, 1])
    expect(files.paths()).toEqual([`${ROOT}a/2.txt`, `${ROOT}a/3.txt`, `${ROOT}b/1.txt`])
  })
})

describe('renameItem', () => {
  test('renames a folder by moving its files', async () => {
    files.seed(`${ROOT}old/a.txt`, 'a')
    expect(await renameItem(drive, itemFromPath(`${ROOT}old/`), 'new')).toBe(`${ROOT}new/`)
    expect(files.paths()).toEqual([`${ROOT}new/a.txt`])
  })

  test('refuses a name that exists', async () => {
    files.seed(`${ROOT}a.txt`)
    files.seed(`${ROOT}b.txt`)
    await expect(renameItem(drive, itemFromPath(`${ROOT}a.txt`), 'b.txt')).rejects.toBeInstanceOf(
      NameTakenError,
    )
  })
})

describe('deleteItem', () => {
  test('deletes a folder tree and keeps its parent', async () => {
    files.seed(`${ROOT}p/a/x.txt`)
    files.seed(`${ROOT}p/a/y/z.txt`)
    await deleteItem(drive, itemFromPath(`${ROOT}p/a/`))
    expect(files.paths()).toEqual([`${ROOT}p/.keep`])
  })
})
