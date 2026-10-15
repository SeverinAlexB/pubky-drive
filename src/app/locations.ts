// Where an item is, in the terms the user sees: an area and the folders inside it.

import type { DriveAccess } from '../drive/access'
import { isWithin, nameOf, parentOf, type Area, type StoragePath } from '../drive/paths'
import type { Route } from './routes'

export const AREA_LABELS: Record<Area, string> = {
  public: 'Public',
  private: 'Private',
}

/** The area and folder names of `path` below its area root, or `undefined` outside both roots. */
export function locate(path: StoragePath, access: DriveAccess) {
  for (const area of ['public', 'private'] as const) {
    const root = access.roots[area]
    if (root && isWithin(path, root)) {
      const inside = path.slice(root.length).replace(/\/$/, '')
      return { area, root, segments: inside ? inside.split('/') : [] }
    }
  }
  return undefined
}

/** The route that opens `folder`. Paths outside the area roots open My Drive. */
export function folderRoute(folder: StoragePath, access: DriveAccess): Route {
  const location = locate(folder, access)
  if (!location) return { view: 'my-drive' }
  return { view: 'folder', area: location.area, folder: location.segments.join('/') }
}

/** `Public › photos › 2026` for a folder path. */
export function folderLabel(folder: StoragePath, access: DriveAccess) {
  const location = locate(folder, access)
  if (!location) return folder
  return [AREA_LABELS[location.area], ...location.segments].join(' › ')
}

/** The name of the folder that contains `path`: an area label for items at an area root. */
export function parentName(path: StoragePath, access: DriveAccess) {
  const parent = parentOf(path)
  const location = locate(parent, access)
  if (!location) return nameOf(parent)
  return location.segments.length === 0 ? AREA_LABELS[location.area] : nameOf(parent)
}

/** Whether `path` is the root folder of an area. */
export function isAreaRoot(path: StoragePath, access: DriveAccess) {
  return path === access.roots.public || path === access.roots.private
}
