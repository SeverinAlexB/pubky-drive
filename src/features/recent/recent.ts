// Recently changed files, from the homeserver's event log. See docs/design.md.

import { mapWithConcurrency } from '../../drive/concurrency'
import type { DriveItem } from '../../drive/items'
import { isFolderPath, isWithin, type StoragePath } from '../../drive/paths'
import type { DriveStorage } from '../../drive/storage'
import type { EventHub } from '../../pubky/eventHub'
import type { StorageEvent } from '../../pubky/events'

/**
 * Up to `limit` files below `roots` that were written most recently and still exist. Reads the
 * session's event history, so it makes no event-stream requests of its own.
 */
export async function loadRecentFiles(
  events: EventHub,
  drive: DriveStorage,
  roots: readonly StoragePath[],
  limit = 50,
): Promise<DriveItem[]> {
  await events.ready
  const paths = latestWrites(events.history())
    .filter((path) => roots.some((root) => isWithin(path, root)) && drive.isVisible(path))
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
