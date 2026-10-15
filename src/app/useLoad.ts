import { useCallback, useEffect, useState } from 'react'
import { describeError } from '../drive/errors'

/**
 * Runs `load` when it or `reloadKey` changes (wrap `load` in `useCallback`) and keeps the latest
 * result. While a reload for the same `load` runs, the previous data stays visible.
 */
export function useLoad<T>(load: () => Promise<T>, reloadKey?: unknown) {
  const [state, setState] = useState<{ data?: T; error?: string; load?: () => Promise<T> }>({})
  // Data from a different `load` (another folder) must not show while the new one loads.
  const current = state.load === load ? state : {}
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    load().then(
      (data) => active && setState({ data, load }),
      (error: unknown) => active && setState({ error: describeError(error), load }),
    )
    return () => {
      active = false
    }
  }, [load, attempt, reloadKey])

  const retry = useCallback(() => {
    setState({})
    setAttempt((count) => count + 1)
  }, [])

  return { data: current.data, error: current.error, retry }
}
