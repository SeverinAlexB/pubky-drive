import type { DriveItem } from '../../drive/items'

export type SortKey = 'name' | 'modified' | 'size'

export interface SortOrder {
  key: SortKey
  ascending: boolean
  foldersFirst: boolean
}

export const DEFAULT_SORT: SortOrder = { key: 'name', ascending: true, foldersFirst: true }

const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Sorted copy of `items`. Items without a value for the sort key go last; ties sort by name. */
export function sortItems<T extends DriveItem>(items: readonly T[], order: SortOrder): T[] {
  const direction = order.ascending ? 1 : -1

  return [...items].sort((a, b) => {
    if (order.foldersFirst && a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    if (order.key === 'name') return nameCollator.compare(a.name, b.name) * direction

    // Items without a value go last in either direction.
    const [left, right] = [valueOf(a, order.key), valueOf(b, order.key)]
    if (left === undefined || right === undefined) {
      if (left !== right) return left === undefined ? 1 : -1
      return nameCollator.compare(a.name, b.name)
    }
    return (left - right) * direction || nameCollator.compare(a.name, b.name)
  })
}

function valueOf(item: DriveItem, key: 'modified' | 'size') {
  return key === 'modified' ? item.modifiedMs : item.sizeBytes
}
