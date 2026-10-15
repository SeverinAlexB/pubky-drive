import { unzipSync } from 'fflate'
import { expect, test } from 'vitest'
import { itemFromPath } from '../../drive/items'
import { MemoryFileStore } from '../../drive/memoryFileStore'
import { DriveStorage } from '../../drive/storage'
import { zipItems } from './download'

test('a ZIP of a folder and a file keeps the folder structure and skips folder markers', async () => {
  const files = new MemoryFileStore()
  files.seed('/pub/pubky-drive/files/docs/a.txt', 'A')
  files.seed('/pub/pubky-drive/files/docs/sub/b.txt', 'B')
  files.seed('/pub/pubky-drive/files/docs/empty/.keep')
  files.seed('/pub/pubky-drive/files/c.txt', 'C')
  const drive = new DriveStorage(files, files.ownerZ32)

  const zip = await zipItems(drive, [
    itemFromPath('/pub/pubky-drive/files/docs/'),
    itemFromPath('/pub/pubky-drive/files/c.txt'),
  ])

  const entries = unzipSync(zip)
  expect(Object.keys(entries).sort()).toEqual(['c.txt', 'docs/a.txt', 'docs/sub/b.txt'])
  expect(new TextDecoder().decode(entries['docs/sub/b.txt'])).toBe('B')
})
