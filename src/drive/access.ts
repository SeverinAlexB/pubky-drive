// What a session may access: the Drive folders, the app's private data, and optionally the whole
// homeserver storage. See docs/design.md, "Access levels".

import type { Capabilities } from '@synonymdev/pubky'
import { APP_ID } from '../config'
import { areaOfPath, isWithin, type Area, type StoragePath } from './paths'

/** Where Drive keeps its files. Public and Private in the sidebar always mean these folders. */
export const DRIVE_ROOTS: Record<Area, StoragePath> = {
  public: `/pub/${APP_ID}/files/`,
  private: `/priv/${APP_ID}/files/`,
}

/** The roots of the homeserver storage, shown in the Homeserver section. */
export const HOMESERVER_ROOTS: Record<Area, StoragePath> = {
  public: '/pub/',
  private: '/priv/',
}

/** Private folder for starred items and the bin. */
export const APP_DATA_ROOT: StoragePath = `/priv/${APP_ID}/`

/** App data folders that listings always hide. */
export const HIDDEN_APP_FOLDERS: readonly StoragePath[] = [
  `${APP_DATA_ROOT}app/`,
  `${APP_DATA_ROOT}bin/`,
]

/** How much of the whole homeserver a session may use: read only, or read and write. */
export type HomeserverLevel = 'view' | 'manage'

/** What the app asks Pubky Ring for: only the Drive folder, or that plus the homeserver. */
export type AccessRequest = 'drive' | HomeserverLevel

const DRIVE_CAPABILITIES = `/pub/${APP_ID}/:rw,/priv/${APP_ID}/:rw`

export function requestedCapabilities(request: AccessRequest): Capabilities {
  switch (request) {
    case 'drive':
      return DRIVE_CAPABILITIES as Capabilities
    case 'view':
      return `${DRIVE_CAPABILITIES},/pub/:r,/priv/:r` as Capabilities
    case 'manage':
      return '/pub/:rw,/priv/:rw'
  }
}

/** Access derived from the capabilities that Pubky Ring actually approved. */
export interface DriveAccess {
  /** Drive folder of each area the session can read and write. Missing areas are unavailable. */
  roots: Partial<Record<Area, StoragePath>>
  /** Whether the session can read and write the app's private data (starred items, bin). */
  appData: boolean
  /** What the session may do in each area of the whole homeserver storage. */
  homeserver: Partial<Record<Area, HomeserverLevel>>
}

export function accessFromCapabilities(capabilities: readonly string[]): DriveAccess {
  const access: DriveAccess = {
    roots: {},
    appData: allows(capabilities, APP_DATA_ROOT, 'rw'),
    homeserver: {},
  }

  for (const area of ['public', 'private'] as const) {
    if (allows(capabilities, DRIVE_ROOTS[area], 'rw')) access.roots[area] = DRIVE_ROOTS[area]
    if (allows(capabilities, HOMESERVER_ROOTS[area], 'rw')) access.homeserver[area] = 'manage'
    else if (allows(capabilities, HOMESERVER_ROOTS[area], 'r')) access.homeserver[area] = 'view'
  }
  return access
}

/** The homeserver level granted for both areas, or `undefined` when one area has none. */
export function homeserverLevel(access: DriveAccess): HomeserverLevel | undefined {
  const { public: publicLevel, private: privateLevel } = access.homeserver
  if (!publicLevel || !privateLevel) return undefined
  return publicLevel === 'manage' && privateLevel === 'manage' ? 'manage' : 'view'
}

/** Whether the session may change the item at `path`: create, rename, move or delete it. */
export function canWrite(access: DriveAccess, path: StoragePath) {
  const area = areaOfPath(path)
  const root = access.roots[area]
  if (root && isWithin(path, root)) return true
  // The app's starred list and bin, but not its folder itself: renaming that would break the app.
  if (access.appData && HIDDEN_APP_FOLDERS.some((folder) => isWithin(path, folder))) return true
  return access.homeserver[area] === 'manage'
}

/** Whether `capabilities` grant every action in `actions` for `path`. */
export function allows(capabilities: readonly string[], path: string, actions: 'r' | 'rw') {
  return [...actions].every((action) =>
    capabilities.some((capability) => {
      const separator = capability.lastIndexOf(':')
      if (separator <= 0) return false
      const scope = capability.slice(0, separator)
      const granted = capability.slice(separator + 1)
      const covers = scope.endsWith('/') ? path.startsWith(scope) : path === scope
      return covers && granted.includes(action)
    }),
  )
}
