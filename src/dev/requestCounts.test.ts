import { expect, test } from 'vitest'
import { classify } from './requestCounts'

const base = 'http://localhost:6286'

test.each([
  ['GET', '/events-stream?user=x&live=true', 'event stream'],
  ['GET', '/pub/pubky-drive/files/', 'list'],
  ['GET', '/pub/pubky-drive/files/a.txt', 'read'],
  ['HEAD', '/priv/pubky-drive/files/a.txt', 'metadata'],
  ['PUT', '/priv/pubky-drive/files/a.txt', 'write'],
  ['DELETE', '/pub/pubky-drive/files/a.txt', 'delete'],
  ['GET', '/session', 'session'],
  ['GET', '/inbox/abc', 'auth relay'],
] as const)('%s %s is counted as %s', (method, path, kind) => {
  expect(classify(method, new URL(`${base}${path}`))).toBe(kind)
})
