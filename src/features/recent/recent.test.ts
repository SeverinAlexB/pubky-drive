import { expect, test } from 'vitest'
import { latestWrites } from './recent'

test('keeps the newest event per path and drops deleted paths', () => {
  expect(
    latestWrites([
      { type: 'PUT', path: '/pub/a.txt', cursor: '1' },
      { type: 'PUT', path: '/pub/b.txt', cursor: '2' },
      { type: 'DEL', path: '/pub/a.txt', cursor: '3' },
      { type: 'PUT', path: '/priv/c.txt', cursor: '10' },
      { type: 'PUT', path: '/pub/b.txt', cursor: '4' },
    ]),
  ).toEqual(['/priv/c.txt', '/pub/b.txt'])
})
