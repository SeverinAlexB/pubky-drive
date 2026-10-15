import { describe, expect, test } from 'vitest'
import {
  encodePathSegment,
  fromListedPath,
  nameOf,
  parentOf,
  pathFromListedUrl,
  rebasePath,
  toWirePath,
} from './paths'

describe('path encoding observed on a 0.16.1 homeserver', () => {
  // Each pair is a stored name and the listed form the homeserver returned for it.
  const observed: [string, string][] = [
    ['plain.txt', 'plain.txt'],
    ['a b.txt', 'a%2520b.txt'],
    ['ü.txt', '%25C3%25BC.txt'],
    ['p%20q.txt', 'p%252520q.txt'],
    ['h#x.txt', 'h%2523x.txt'],
    ['q?y.txt', 'q%253Fy.txt'],
    ['c:d,e.txt', 'c:d,e.txt'],
  ]

  test.each(observed)('listed name of %s decodes to the stored name', (name, listed) => {
    expect(fromListedPath(`/pub/enc/${listed}`)).toBe(`/pub/enc/${name}`)
  })

  test.each(observed)('wire form of %s encodes once', (name, listed) => {
    expect(encodePathSegment(name)).toBe(decodeURIComponent(listed))
  })

  test('wire paths keep separators and encode each segment', () => {
    expect(toWirePath('/pub/ev/My Photos/x.txt')).toBe('/pub/ev/My%20Photos/x.txt')
  })
})

describe('listed URLs', () => {
  const owner = 'eni8dxyat7i9ukbztpcokj61qzxqyjwiouhxi3joakh3oej3cyty'

  test('become plain paths', () => {
    const url = `pubky://${owner}/pub/pubky-drive/files/My%2520File%2520%25C3%25BC.txt`
    expect(pathFromListedUrl(url, owner)).toBe('/pub/pubky-drive/files/My File ü.txt')
  })

  test('keep the trailing slash of folders', () => {
    expect(pathFromListedUrl(`pubky://${owner}/pub/x/photos/`, owner)).toBe('/pub/x/photos/')
  })

  test("of another user's files are rejected", () => {
    expect(() => pathFromListedUrl('pubky://someoneelse/pub/x/a.txt', owner)).toThrow()
  })
})

describe('path helpers', () => {
  test('name and parent of files and folders', () => {
    expect(nameOf('/pub/a/b.txt')).toBe('b.txt')
    expect(nameOf('/pub/a/b/')).toBe('b')
    expect(parentOf('/pub/a/b.txt')).toBe('/pub/a/')
    expect(parentOf('/pub/a/b/')).toBe('/pub/a/')
  })

  test('rebasing moves a path to another folder', () => {
    expect(rebasePath('/pub/a/b/c.txt', '/pub/a/', '/priv/z/')).toBe('/priv/z/b/c.txt')
    expect(() => rebasePath('/pub/q.txt', '/pub/a/', '/priv/z/')).toThrow()
  })
})
