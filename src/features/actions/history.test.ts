import { describe, expect, test } from 'vitest'
import { ActionHistory, type Undoable } from './history'

/** An action that sets `state.value` and records its reversals in `log`. */
function setValue(state: { value: string }, from: string, to: string, log: string[]): Undoable {
  state.value = to
  return {
    async undo() {
      log.push(`${to}→${from}`)
      return setValue(state, to, from, log)
    },
  }
}

describe('ActionHistory', () => {
  test('undoes the latest action first, and redoes it', async () => {
    const state = { value: 'a' }
    const log: string[] = []
    const history = new ActionHistory()
    history.record(setValue(state, 'a', 'b', log))
    history.record(setValue(state, 'b', 'c', log))

    expect(await history.undo()).toBe(true)
    expect(state.value).toBe('b')
    expect(await history.undo()).toBe(true)
    expect(state.value).toBe('a')
    expect(await history.undo()).toBe(false)

    expect(await history.redo()).toBe(true)
    expect(state.value).toBe('b')
    expect(log).toEqual(['c→b', 'b→a', 'a→b'])
  })

  test('a new action clears what could be redone', async () => {
    const state = { value: 'a' }
    const history = new ActionHistory()
    history.record(setValue(state, 'a', 'b', []))
    await history.undo()
    history.record(setValue(state, 'a', 'x', []))

    expect(await history.redo()).toBe(false)
    expect(state.value).toBe('x')
  })

  test('undoes a given action once, as a snackbar’s Undo button does', async () => {
    const state = { value: 'a' }
    const history = new ActionHistory()
    const first = setValue(state, 'a', 'b', [])
    history.record(first)
    history.record(setValue(state, 'b', 'c', []))

    expect(await history.undo(first)).toBe(true)
    expect(await history.undo(first)).toBe(false)
    expect(state.value).toBe('a')
  })

  test('runs one undo at a time and drops an action whose undo fails', async () => {
    let finish!: () => void
    const slow: Undoable = {
      undo: () => new Promise((resolve) => (finish = () => resolve(slow))),
    }
    const failing: Undoable = { undo: () => Promise.reject(new Error('gone')) }
    const history = new ActionHistory()
    history.record(failing)
    history.record(slow)

    const running = history.undo()
    expect(await history.undo()).toBe(false)
    finish()
    expect(await running).toBe(true)

    await expect(history.undo()).rejects.toThrow('gone')
    expect(await history.undo()).toBe(false)
  })
})
