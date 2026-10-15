import { useCallback } from 'react'
import { useDrive } from '../../app/DriveContext'
import { useLoad } from '../../app/useLoad'
import { mapWithConcurrency } from '../../drive/concurrency'
import { parentOf } from '../../drive/paths'
import { ItemBrowser } from '../browse/ItemBrowser'
import type { ListItem } from '../browse/listItem'

/** Starred items that still exist. */
export function StarredView() {
  const { drive, access, starred, version } = useDrive()
  const load = useCallback(async (): Promise<ListItem[]> => {
    const items = await mapWithConcurrency([...starred], 8, (path) => drive.stat(path))
    return items.flatMap((item) => (item ? [{ ...item, location: parentOf(item.path) }] : []))
  }, [drive, starred])
  const { data, error, retry } = useLoad(load, version)

  if (!access.appData) {
    return (
      <div className="browser-state">
        <h2>Starred isn’t available</h2>
        <p>
          Pubky Drive needs access to its private folder to keep stars. Sign out and sign in again
          to grant access.
        </p>
      </div>
    )
  }

  return (
    <ItemBrowser
      title={<h1>Starred</h1>}
      items={data}
      error={error}
      onRetry={retry}
      columns="location"
      emptyState={
        <>
          <h2>No starred items</h2>
          <p>Add stars to things you want to find easily later.</p>
        </>
      }
    />
  )
}
