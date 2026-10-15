// Which rows are selected. See docs/spec/03-file-list.md, "Selection".

import { useCallback, useMemo, useState } from 'react'
import type { StoragePath } from '../../drive/paths'

export interface SelectionState {
  selected: ReadonlySet<StoragePath>
  /** The row Shift-click and Shift+arrow extend from. */
  anchor?: StoragePath
  /** The row the arrow keys move from. */
  focused?: StoragePath
}

export type SelectGesture = 'only' | 'toggle' | 'range'

/** The selection after clicking `path` in `order` (the displayed paths) with `gesture`. */
export function selectWithGesture(
  state: SelectionState,
  order: readonly StoragePath[],
  path: StoragePath,
  gesture: SelectGesture,
): SelectionState {
  if (gesture === 'toggle') {
    const selected = new Set(state.selected)
    if (selected.has(path)) selected.delete(path)
    else selected.add(path)
    return { selected, anchor: path, focused: path }
  }

  if (gesture === 'range' && state.anchor && order.includes(state.anchor)) {
    const [from, to] = [order.indexOf(state.anchor), order.indexOf(path)].sort((a, b) => a - b)
    return { selected: new Set(order.slice(from, to + 1)), anchor: state.anchor, focused: path }
  }

  return { selected: new Set([path]), anchor: path, focused: path }
}

/** The selection after moving `step` rows from the focused row, extending it with Shift. */
export function selectByStep(
  state: SelectionState,
  order: readonly StoragePath[],
  step: number,
  extend: boolean,
): SelectionState {
  if (order.length === 0) return state
  const current = state.focused ? order.indexOf(state.focused) : -1
  const next =
    current === -1
      ? step > 0
        ? 0
        : order.length - 1
      : Math.max(0, Math.min(order.length - 1, current + step))
  return selectWithGesture(state, order, order[next], extend ? 'range' : 'only')
}

export function useSelection(order: readonly StoragePath[]) {
  const [state, setState] = useState<SelectionState>({ selected: new Set() })

  // Rows that disappeared (moved, deleted) drop out of the selection.
  const selected = useMemo(
    () => new Set(order.filter((path) => state.selected.has(path))),
    [order, state.selected],
  )

  const select = useCallback(
    (path: StoragePath, gesture: SelectGesture) =>
      setState((current) => selectWithGesture(current, order, path, gesture)),
    [order],
  )
  const step = useCallback(
    (by: number, extend: boolean) =>
      setState((current) => selectByStep(current, order, by, extend)),
    [order],
  )
  const selectAll = useCallback(
    () => setState({ selected: new Set(order), anchor: order[0], focused: order[0] }),
    [order],
  )
  const clear = useCallback(() => setState({ selected: new Set() }), [])

  return { selected, focused: state.focused, select, step, selectAll, clear }
}
