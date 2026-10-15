import { expect, test } from 'vitest'
import { MemoryFileStore } from '../../drive/memoryFileStore'
import { DriveStorage } from '../../drive/storage'
import { listEverything, matchByName } from './search'

test('finds files and derived folders by name, ignoring case and accents', async () => {
  const files = new MemoryFileStore()
  files.seed('/pub/pubky-drive/files/Notes/Café menu.txt')
  files.seed('/pub/pubky-drive/files/Notes/.keep')
  files.seed('/priv/pubky-drive/files/old notes.md')
  files.seed('/priv/pubky-drive/files/photo.png')
  const drive = new DriveStorage(files, files.ownerZ32)

  const everything = await listEverything(drive, [
    '/pub/pubky-drive/files/',
    '/priv/pubky-drive/files/',
  ])

  expect(matchByName(everything, 'NOTES').map((item) => item.path)).toEqual([
    '/pub/pubky-drive/files/Notes/',
    '/priv/pubky-drive/files/old notes.md',
  ])
  expect(matchByName(everything, 'cafe').map((item) => item.name)).toEqual(['Café menu.txt'])
  expect(matchByName(everything, '  ')).toEqual([])
})
