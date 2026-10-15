// What a session may access: the area roots it can browse and whether it can store app data.
// See docs/design.md, "Access modes".

import type { Capabilities } from '@synonymdev/pubky'
import { APP_ID } from '../config'
import type { Area, StoragePath } from './paths'

/** What the user lets Pubky Drive access, chosen at sign-in. */
export type AccessMode = 'drive-folder' | 'entire-homeserver'

const AREA_ROOTS: Record<AccessMode, Record<Area, StoragePath>> = {
  'drive-folder': {
    public: `/pub/${APP_ID}/files/`,
    private: `/priv/${APP_ID}/files/`,
  },
  'entire-homeserver': {
    public: '/pub/',
    private: '/priv/',
  },
}

/** Private folder for starred items and the bin, in both modes. */
export const APP_DATA_ROOT: StoragePath = `/priv/${APP_ID}/`

/** App data folders that listings hide in entire-homeserver mode. */
export const HIDDEN_APP_FOLDERS: readonly StoragePath[] = [
  `${APP_DATA_ROOT}app/`,
  `${APP_DATA_ROOT}bin/`,
]

export function requestedCapabilities(mode: AccessMode): Capabilities {
  if (mode === 'entire-homeserver') return '/pub/:rw,/priv/:rw'
  return `/pub/${APP_ID}/:rw,/priv/${APP_ID}/:rw`
}

/** Access derived from the capabilities that Pubky Ring actually approved. */
export interface DriveAccess {
  mode: AccessMode
  /** Root folder of each area the session can read and write. Missing areas are unavailable. */
  roots: Partial<Record<Area, StoragePath>>
  /** Whether the session can read and write the app's private data (starred items, bin). */
  appData: boolean
}

export function accessFromCapabilities(capabilities: readonly string[]): DriveAccess {
  const roots: Partial<Record<Area, StoragePath>> = {}
  let mode: AccessMode = 'drive-folder'

  for (const area of ['public', 'private'] as const) {
    if (canReadWrite(capabilities, AREA_ROOTS['entire-homeserver'][area])) {
      roots[area] = AREA_ROOTS['entire-homeserver'][area]
      mode = 'entire-homeserver'
    } else if (canReadWrite(capabilities, AREA_ROOTS['drive-folder'][area])) {
      roots[area] = AREA_ROOTS['drive-folder'][area]
    }
  }

  return { mode, roots, appData: canReadWrite(capabilities, APP_DATA_ROOT) }
}

/** Whether some capability grants both read and write access to `path`. */
export function canReadWrite(capabilities: readonly string[], path: string) {
  return ['r', 'w'].every((action) =>
    capabilities.some((capability) => {
      const separator = capability.lastIndexOf(':')
      if (separator <= 0) return false
      const scope = capability.slice(0, separator)
      const actions = capability.slice(separator + 1)
      const covers = scope.endsWith('/') ? path.startsWith(scope) : path === scope
      return covers && actions.includes(action)
    }),
  )
}
