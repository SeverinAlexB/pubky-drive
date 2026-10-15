// Where an item is, in the terms the user sees: a section (Pubky Drive or Homeserver), an area, and
// the folders inside it.

import { DRIVE_ROOTS, HOMESERVER_ROOTS } from '../drive/access'
import { isWithin, parentOf, type Area, type StoragePath } from '../drive/paths'
import type { Route, Scope } from './routes'

/** Names of the areas in Pubky Drive. */
export const AREA_LABELS: Record<Area, string> = {
  public: 'Public',
  private: 'Private',
}

/** Names of the areas in the Homeserver section, which shows raw storage paths. */
export const HOMESERVER_AREA_LABELS: Record<Area, string> = {
  public: '/pub',
  private: '/priv',
}

export function areaLabel(scope: Scope, area: Area) {
  return scope === 'drive' ? AREA_LABELS[area] : HOMESERVER_AREA_LABELS[area]
}

export interface Location {
  scope: Scope
  area: Area
  root: StoragePath
  /** Folder names between the area root and the path. */
  segments: string[]
}

/**
 * Where `path` is. Without `scope`, where its data belongs: paths inside the Drive folders belong to
 * Pubky Drive, everything else to the homeserver. With a `scope`, where that section shows it: the
 * Homeserver section also shows the Drive folders, as ordinary folders.
 */
export function locate(path: StoragePath, scope?: Scope): Location {
  const sections: Scope[] = scope ? [scope] : ['drive', 'homeserver']
  for (const area of ['public', 'private'] as const) {
    for (const section of sections) {
      const root = section === 'drive' ? DRIVE_ROOTS[area] : HOMESERVER_ROOTS[area]
      if (!isWithin(path, root)) continue
      const inside = path.slice(root.length).replace(/\/$/, '')
      return { scope: section, area, root, segments: inside ? inside.split('/') : [] }
    }
  }
  throw new Error(`${path} isn't a storage path${scope ? ` in the ${scope} section` : ''}.`)
}

/** The route that opens `folder`, in `scope` or else the section its data belongs to. */
export function folderRoute(folder: StoragePath, scope?: Scope): Route {
  const location = locate(folder, scope)
  return {
    view: 'folder',
    scope: location.scope,
    area: location.area,
    folder: location.segments.join('/'),
  }
}

/** `Public › photos` for a Drive folder, `/pub › pubky.app` for a homeserver folder. */
export function folderLabel(folder: StoragePath, scope?: Scope) {
  const location = locate(folder, scope)
  return [areaLabel(location.scope, location.area), ...location.segments].join(' › ')
}

/**
 * The folder in the other area (public or private) of the same section that matches `path`'s
 * folder, such as `/priv/pubky-drive/files/photos/` for `/pub/pubky-drive/files/photos/a.png`.
 */
export function matchingFolderInOtherArea(path: StoragePath): StoragePath {
  const { scope, area, root } = locate(path)
  const otherArea: Area = area === 'public' ? 'private' : 'public'
  const otherRoot = scope === 'drive' ? DRIVE_ROOTS[otherArea] : HOMESERVER_ROOTS[otherArea]
  return `${otherRoot}${parentOf(path).slice(root.length)}` as StoragePath
}

/** Whether `path` is the root of an area in Pubky Drive or the Homeserver section. */
export function isAreaRoot(path: StoragePath) {
  return locate(path).segments.length === 0
}
