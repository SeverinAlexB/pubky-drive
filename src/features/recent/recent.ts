// Recently changed files, read from the homeserver's event log. See docs/design.md.

import type { Session } from '@synonymdev/pubky'
import { mapWithConcurrency } from '../../drive/concurrency'
import type { DriveItem } from '../../drive/items'
import { isFolderPath, type StoragePath } from '../../drive/paths'
import type { DriveStorage } from '../../drive/storage'
import { readLatestEvents, type StorageEvent } from '../../pubky/events'

const EVENTS_PER_AREA = 300

/** Up to `limit` files that were written most recently below `roots` and still exist. */
export async function loadRecentFiles(
  session: Session,
  drive: DriveStorage,
  roots: readonly StoragePath[],
  limit = 50,
): Promise<DriveItem[]> {
  const eventsPerRoot = await Promise.all(
    roots.map((root) => readLatestEvents(session, root, EVENTS_PER_AREA)),
  )
  const paths = latestWrites(eventsPerRoot.flat())
    .filter((path) => drive.isVisible(path))
    .slice(0, limit)
  const items = await mapWithConcurrency(paths, 8, (path) => drive.stat(path))
  return items.filter((item): item is DriveItem => item !== undefined)
}

/**
 * Paths whose latest event is a write, newest first. A path whose latest event is a delete is
 * left out, even when it was written before.
 */
export function latestWrites(events: readonly StorageEvent[]): StoragePath[] {
  const newestFirst = [...events].sort((a, b) => Number(b.cursor) - Number(a.cursor))
  const seen = new Set<StoragePath>()
  const written: StoragePath[] = []

  for (const event of newestFirst) {
    if (seen.has(event.path)) continue
    seen.add(event.path)
    if (event.type === 'PUT' && !isFolderPath(event.path)) written.push(event.path)
  }
  return written
}
