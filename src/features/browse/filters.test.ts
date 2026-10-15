import { expect, test } from 'vitest'
import { isModifiedIn, modifiedFilters } from './filters'

const now = new Date(2026, 9, 15, 12, 0).getTime()
const at = (...date: [number, number, number, number?]) =>
  new Date(...(date as [number, number, number])).getTime()

test('ranges count calendar days back from today', () => {
  expect(isModifiedIn(at(2026, 9, 15, 0), 'today', now)).toBe(true)
  expect(isModifiedIn(at(2026, 9, 14), 'today', now)).toBe(false)
  expect(isModifiedIn(at(2026, 9, 9), 'last-7-days', now)).toBe(true)
  expect(isModifiedIn(at(2026, 9, 8), 'last-7-days', now)).toBe(false)
  expect(isModifiedIn(at(2026, 8, 16), 'last-30-days', now)).toBe(true)
  expect(isModifiedIn(at(2026, 0, 1), 'this-year', now)).toBe(true)
  expect(isModifiedIn(at(2025, 11, 31), 'last-year', now)).toBe(true)
  expect(isModifiedIn(at(2024, 11, 31), 'last-year', now)).toBe(false)
})

test('items without a modification time match no range', () => {
  expect(isModifiedIn(undefined, 'this-year', now)).toBe(false)
})

test('year ranges name the year, as Drive does', () => {
  expect(modifiedFilters(now).map((filter) => filter.label)).toEqual([
    'Today',
    'Last 7 days',
    'Last 30 days',
    'This year (2026)',
    'Last year (2025)',
  ])
})
