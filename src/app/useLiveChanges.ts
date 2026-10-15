import { useEffect, useState } from 'react'
import { isWithin, type StoragePath } from '../drive/paths'
import { useDrive } from './DriveContext'

const SETTLE_MS = 400

/**
 * A number that increases shortly after files below any of `folders` change on the homeserver,
 * including changes from other devices and apps. Bursts of changes count once.
 */
export function useLiveChanges(folders: readonly StoragePath[]) {
  const { events } = useDrive()
  const [changes, setChanges] = useState(0)
  const key = folders.join('\n')

  useEffect(() => {
    const watched = key.split('\n').filter(Boolean)
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = events.subscribe((event) => {
      if (!watched.some((folder) => isWithin(event.path, folder))) return
      clearTimeout(timer)
      timer = setTimeout(() => setChanges((count) => count + 1), SETTLE_MS)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [events, key])

  return changes
}
