import { expect, test } from 'vitest'
import type { StoragePath } from '../../drive/paths'
import { changedApps } from './changedApps'

const labels = (apps: ReturnType<typeof changedApps>) =>
  apps.map((app) => `${app.name}${app.ownData ? ' (own)' : ''}`)
const names = (...paths: string[]) => labels(changedApps({ items: paths as StoragePath[] }))

test('files inside the Drive folders touch no app', () => {
  expect(names('/priv/pubky-drive/files/a.txt', '/pub/pubky-drive/files/photos/')).toEqual([])
})

test('other apps are named by their folder, each once', () => {
  expect(
    names('/pub/pubky.app/posts/1', '/pub/pubky.app/profile.json', '/priv/other.app/x/'),
  ).toEqual(['pubky.app', 'other.app'])
})

test('Pubky Drive’s bin, settings and Drive folders are its own data', () => {
  expect(names('/priv/pubky-drive/bin/1/entry.json')).toEqual(['pubky-drive (own)'])
  expect(names('/priv/pubky-drive/files/')).toEqual(['pubky-drive (own)'])
  expect(names('/pub/pubky-drive/')).toEqual(['pubky-drive (own)'])
})

test('the Drive folders receive items without touching Pubky Drive’s own data', () => {
  expect(labels(changedApps({ into: ['/priv/pubky-drive/files/' as StoragePath] }))).toEqual([])
  expect(
    labels(
      changedApps({
        items: ['/pub/pubky.app/a.json' as StoragePath],
        into: ['/pub/' as StoragePath],
      }),
    ),
  ).toEqual(['pubky.app', '/pub'])
})

test('files at the top level of an area are named by the area', () => {
  expect(names('/pub/', '/pub/readme.txt')).toEqual(['/pub'])
  expect(names('/priv/notes.txt')).toEqual(['/priv'])
})
