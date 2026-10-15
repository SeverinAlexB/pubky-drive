import { useCallback } from 'react'
import { useDrive } from '../../app/DriveContext'
import { useLiveChanges } from '../../app/useLiveChanges'
import { useLoad } from '../../app/useLoad'
import { parentOf } from '../../drive/paths'
import { ItemBrowser } from '../browse/ItemBrowser'
import { dayGroupOf } from '../browse/format'
import type { ListItem } from '../browse/listItem'
import { loadRecentFiles } from './recent'

/** Recently changed files, grouped by day. See docs/design.md, "Starred, Recent and search". */
export function RecentView() {
  const { events, drive, roots, version } = useDrive()
  const load = useCallback(async (): Promise<ListItem[]> => {
    const files = await loadRecentFiles(events, drive, roots)
    return files.map((file) => ({ ...file, location: parentOf(file.path) }))
  }, [events, drive, roots])
  const liveChanges = useLiveChanges(roots)
  const { data, error, retry } = useLoad(load, `${version}:${liveChanges}`)

  return (
    <ItemBrowser
      title={<h1>Recent</h1>}
      items={data}
      error={error}
      onRetry={retry}
      columns="location"
      groupBy={(item) => dayGroupOf(item.modifiedMs)}
      emptyState={<p>No recent files</p>}
    />
  )
}
