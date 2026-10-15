// The folder lists of the Move dialog's Recent and Starred tabs. See docs/spec/06-organise.md.

import type { DriveItem } from '../../drive/items'
import { parentOf, type StoragePath } from '../../drive/paths'
import type { StorageEvent } from '../../pubky/events'

/**
 * Up to `limit` existing folders where files were written most recently, newest first, then the
 * folders in `nearby` (where the moved items are). `history` is newest first; `folders` are the
 * folders that exist.
 */
export function recentFolders(
  history: readonly StorageEvent[],
  folders: readonly DriveItem[],
  nearby: StoragePath,
  limit = 8,
): DriveItem[] {
  const byPath = new Map(folders.map((folder) => [folder.path, folder]))
  const recent = new Map<StoragePath, DriveItem>()
  for (const event of history) {
    if (event.type !== 'PUT') continue
    const folder = byPath.get(parentOf(event.path))
    if (folder) recent.set(folder.path, folder)
    if (recent.size >= limit) break
  }
  for (const folder of folders) {
    if (recent.size >= limit) break
    if (parentOf(folder.path) === nearby) recent.set(folder.path, folder)
  }
  return [...recent.values()]
}

/** The starred folders that still exist, by name. */
export function starredFolders(
  starred: ReadonlySet<StoragePath>,
  folders: readonly DriveItem[],
): DriveItem[] {
  return folders
    .filter((folder) => starred.has(folder.path))
    .sort((a, b) => a.name.localeCompare(b.name))
}
