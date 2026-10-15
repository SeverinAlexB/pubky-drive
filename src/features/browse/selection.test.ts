import { expect, test } from 'vitest'
import type { StoragePath } from '../../drive/paths'
import { selectByStep, selectWithGesture, type SelectionState } from './selection'

const order: StoragePath[] = ['/pub/a', '/pub/b', '/pub/c', '/pub/d']
const none: SelectionState = { selected: new Set() }

test('a plain click selects one row, Cmd-click toggles, Shift-click selects a range', () => {
  const one = selectWithGesture(none, order, '/pub/b', 'only')
  expect([...one.selected]).toEqual(['/pub/b'])

  const two = selectWithGesture(one, order, '/pub/d', 'toggle')
  expect([...two.selected]).toEqual(['/pub/b', '/pub/d'])

  const range = selectWithGesture(one, order, '/pub/d', 'range')
  expect([...range.selected]).toEqual(['/pub/b', '/pub/c', '/pub/d'])

  const untoggled = selectWithGesture(two, order, '/pub/b', 'toggle')
  expect([...untoggled.selected]).toEqual(['/pub/d'])
})

test('arrow keys move the selection and Shift extends it', () => {
  const first = selectByStep(none, order, 1, false)
  expect([...first.selected]).toEqual(['/pub/a'])

  const extended = selectByStep(selectByStep(first, order, 1, true), order, 1, true)
  expect([...extended.selected]).toEqual(['/pub/a', '/pub/b', '/pub/c'])

  const atEnd = selectByStep(
    { selected: new Set(['/pub/d']), anchor: '/pub/d', focused: '/pub/d' },
    order,
    1,
    false,
  )
  expect([...atEnd.selected]).toEqual(['/pub/d'])
})
