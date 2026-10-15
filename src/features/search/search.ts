// Name search across both areas. See docs/spec/10-search.md.

import { itemFromPath, type DriveItem } from '../../drive/items'
import { isWithin, type StoragePath } from '../../drive/paths'
import type { DriveStorage } from '../../drive/storage'

/**
 * Every visible file and folder below `roots`, without metadata. Folders are derived from the
 * file paths, because the homeserver only stores files.
 */
export async function listEverything(
  drive: DriveStorage,
  roots: readonly StoragePath[],
): Promise<DriveItem[]> {
  const paths = new Set<StoragePath>()

  for (const root of roots) {
    for (const file of await drive.listFilesBelow(root)) {
      for (const folder of foldersBetween(root, file)) paths.add(folder)
      paths.add(file)
    }
  }

  return [...paths].filter((path) => drive.isVisible(path)).map(itemFromPath)
}

/** Items whose name contains `query`, ignoring case and accents. Folders come first. */
export function matchByName(items: readonly DriveItem[], query: string): DriveItem[] {
  const needle = normalize(query.trim())
  if (!needle) return []
  return items
    .filter((item) => normalize(item.name).includes(needle))
    .sort((a, b) =>
      a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1,
    )
}

function foldersBetween(root: StoragePath, file: StoragePath): StoragePath[] {
  if (!isWithin(file, root)) return []
  const segments = file.slice(root.length).split('/').slice(0, -1)
  return segments.map(
    (_, index) => `${root}${segments.slice(0, index + 1).join('/')}/` as StoragePath,
  )
}

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
