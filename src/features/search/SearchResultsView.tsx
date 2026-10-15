import { useCallback } from 'react'
import { useDrive } from '../../app/DriveContext'
import { useLoad } from '../../app/useLoad'
import { mapWithConcurrency } from '../../drive/concurrency'
import { parentOf } from '../../drive/paths'
import { ItemBrowser } from '../browse/ItemBrowser'
import type { ListItem } from '../browse/listItem'
import { matchByName } from './search'

const MAX_RESULTS = 200

/** Items whose names match the query. See docs/spec/10-search.md. */
export function SearchResultsView({ query }: { query: string }) {
  const { drive, loadSearchIndex, version } = useDrive()
  const load = useCallback(async (): Promise<ListItem[]> => {
    const matches = matchByName(await loadSearchIndex(), query).slice(0, MAX_RESULTS)
    const described = await mapWithConcurrency(matches, 8, async (item) =>
      item.kind === 'file' ? ((await drive.stat(item.path)) ?? item) : item,
    )
    return described.map((item) => ({ ...item, location: parentOf(item.path) }))
  }, [drive, loadSearchIndex, query])
  const { data, error, retry } = useLoad(load, version)

  return (
    <ItemBrowser
      title={<h1>Search results</h1>}
      items={data}
      error={error}
      onRetry={retry}
      columns="location"
      emptyState={<p>No results for ‘{query}’</p>}
    />
  )
}
