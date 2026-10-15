import { expect, test } from 'vitest'
import { parseRoute, routeHash, type Route } from './routes'

test.each<[string, Route]>([
  ['', { view: 'my-drive' }],
  ['#/drive', { view: 'my-drive' }],
  ['#/drive/public', { view: 'folder', area: 'public', folder: '' }],
  [
    '#/drive/private/My%20Photos/2026',
    { view: 'folder', area: 'private', folder: 'My Photos/2026' },
  ],
  ['#/recent', { view: 'recent' }],
  ['#/bin', { view: 'bin' }],
  ['#/search?q=caf%C3%A9+menu', { view: 'search', query: 'café menu' }],
  ['#/view/pubkyabc/pub/x/a%20b.txt', { view: 'viewer', address: 'pubkyabc/pub/x/a%20b.txt' }],
  ['#/unknown', { view: 'my-drive' }],
])('parses %j', (hash, route) => {
  expect(parseRoute(hash)).toEqual(route)
})

test.each<Route>([
  { view: 'folder', area: 'public', folder: 'a b/ü#?' },
  { view: 'search', query: 'a&b=c' },
  { view: 'starred' },
])('round-trips %j', (route) => {
  expect(parseRoute(routeHash(route))).toEqual(route)
})
