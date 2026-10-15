import { expect, test } from 'vitest'
import { dayGroupOf, formatDate, formatSize, shortKey } from './format'

test.each([
  [undefined, '—'],
  [0, '0 bytes'],
  [1, '1 byte'],
  [47, '47 bytes'],
  [105_871, '103 KB'],
  [2_306_867, '2.2 MB'],
  [1_503_238_554, '1.4 GB'],
])('formatSize(%j) is %j', (bytes, text) => {
  expect(formatSize(bytes)).toBe(text)
})

test('formatDate shows time today, day and month this year, full date before', () => {
  const now = new Date(2026, 9, 15, 12, 0).getTime()
  expect(formatDate(new Date(2026, 9, 15, 10, 13).getTime(), now, 'en-GB')).toBe('10:13')
  expect(formatDate(new Date(2026, 7, 24).getTime(), now, 'en-GB')).toBe('24 Aug')
  expect(formatDate(new Date(2024, 10, 28).getTime(), now, 'en-GB')).toBe('28 Nov 2024')
})

test('dayGroupOf groups by calendar day', () => {
  const now = new Date(2026, 9, 15, 12, 0).getTime()
  expect(dayGroupOf(new Date(2026, 9, 15, 0, 1).getTime(), now)).toBe('Today')
  expect(dayGroupOf(new Date(2026, 9, 14, 23, 59).getTime(), now)).toBe('Yesterday')
  expect(dayGroupOf(new Date(2026, 9, 10).getTime(), now)).toBe('Earlier this week')
  expect(dayGroupOf(new Date(2026, 8, 20).getTime(), now)).toBe('Earlier this month')
  expect(dayGroupOf(new Date(2025, 0, 1).getTime(), now)).toBe('Older')
})

test('shortKey keeps the start and end of the key', () => {
  expect(shortKey('pubky8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo')).toBe(
    'pubky8pin…5ewo',
  )
})
