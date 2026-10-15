import { expect, test } from 'vitest'
import { folderLabel, folderRoute, isAreaRoot, locate } from './locations'

test('paths inside the Drive folders belong to Pubky Drive', () => {
  expect(locate('/priv/pubky-drive/files/Notes/')).toEqual({
    scope: 'drive',
    area: 'private',
    root: '/priv/pubky-drive/files/',
    segments: ['Notes'],
  })
  expect(folderLabel('/priv/pubky-drive/files/Notes/')).toBe('Private › Notes')
})

test('other paths belong to the homeserver, with raw area names', () => {
  expect(folderRoute('/pub/pubky.app/posts/')).toEqual({
    view: 'folder',
    scope: 'homeserver',
    area: 'public',
    folder: 'pubky.app/posts',
  })
  expect(folderLabel('/pub/pubky-drive/')).toBe('/pub › pubky-drive')
})

test('area roots of both sections are recognised', () => {
  expect(isAreaRoot('/pub/')).toBe(true)
  expect(isAreaRoot('/pub/pubky-drive/files/')).toBe(true)
  expect(isAreaRoot('/pub/pubky-drive/')).toBe(false)
})

test('the Homeserver section shows Drive folders as ordinary folders', () => {
  const photos = '/priv/pubky-drive/files/photos/'
  expect(folderRoute(photos, 'homeserver')).toEqual({
    view: 'folder',
    scope: 'homeserver',
    area: 'private',
    folder: 'pubky-drive/files/photos',
  })
  expect(folderLabel(photos, 'homeserver')).toBe('/priv › pubky-drive › files › photos')
  expect(folderLabel(photos)).toBe('Private › photos')
})
