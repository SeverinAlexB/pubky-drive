import { useCallback } from 'react'
import { useDrive } from '../../app/DriveContext'
import { useLoad } from '../../app/useLoad'
import { areaOfPath } from '../../drive/paths'
import { useItemActions } from '../actions/useItemActions'
import { dayGroupOf } from '../browse/format'
import { ItemBrowser } from '../browse/ItemBrowser'
import type { ListItem } from '../browse/listItem'
import { listBin } from './bin'

/** The bin. See docs/spec/07-bin.md. */
export function BinView() {
  const { drive, access, version } = useDrive()
  const actions = useItemActions()
  const load = useCallback(async (): Promise<ListItem[]> => {
    const entries = await listBin(drive)
    return entries.map((entry) => ({
      kind: entry.kind,
      path: entry.contentPath,
      name: entry.name,
      area: areaOfPath(entry.originalPath),
      sizeBytes: entry.sizeBytes,
      binEntry: entry,
    }))
  }, [drive])
  const { data, error, retry } = useLoad(load, version)

  if (!access.appData) {
    return (
      <div className="browser-state">
        <h2>The bin isn’t available</h2>
        <p>
          Pubky Drive needs access to its private folder for the bin. Items are deleted forever
          instead.
        </p>
      </div>
    )
  }

  const entries = (data ?? []).flatMap((item) => (item.binEntry ? [item.binEntry] : []))

  return (
    <ItemBrowser
      title={<h1>Bin</h1>}
      items={data}
      error={error}
      onRetry={retry}
      columns="bin"
      groupBy={(item) => dayGroupOf(item.binEntry?.binnedAtMs)}
      banner={
        <div className="bin-banner">
          <span>Items in the bin are deleted forever after 30 days</span>
          <button
            type="button"
            className="button button-text"
            disabled={entries.length === 0}
            onClick={() => void actions.emptyBin(entries)}
          >
            Empty bin
          </button>
        </div>
      }
      emptyState={
        <>
          <h2>Nothing in the bin</h2>
          <p>
            Move items you don’t need to the bin. Items in the bin are deleted forever after 30
            days.
          </p>
        </>
      }
    />
  )
}
