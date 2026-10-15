// Which apps' data a change in the Homeserver section touches. See docs/spec/02-navigation.md,
// "Changing other apps' files".

import { DRIVE_ROOTS } from '../../drive/access'
import { isWithin, type StoragePath } from '../../drive/paths'
import { APP_ID } from '../../config'

/** The folder of one app, or the top level of an area, that a change touches. */
export interface ChangedApp {
  /** The app's folder, such as `/pub/pubky.app/`, or the area root for files at the top level. */
  folder: StoragePath
  /** The app's folder name, such as `pubky.app`, or `/pub` for the top level. */
  name: string
  /** Pubky Drive's own data outside its Drive folders: the bin, the settings, the folders themselves. */
  ownData: boolean
}

/** What a change touches: items that are renamed, moved or deleted, and folders that receive items. */
export interface Change {
  items?: readonly StoragePath[]
  into?: readonly StoragePath[]
}

/**
 * The app folders that `change` touches, each once. Anything inside the Drive folders touches
 * none: changing it is the same as in the Pubky Drive section. The Drive folders themselves are
 * Pubky Drive's own data when they change, but not when they receive items.
 */
export function changedApps({ items = [], into = [] }: Change): ChangedApp[] {
  const apps = new Map<StoragePath, ChangedApp>()
  const touched = [
    ...items.map((path) => changedApp(path, false)),
    ...into.map((folder) => changedApp(folder, true)),
  ]
  for (const app of touched) if (app) apps.set(app.folder, app)
  return [...apps.values()]
}

function changedApp(path: StoragePath, receives: boolean): ChangedApp | undefined {
  const driveRoots = [DRIVE_ROOTS.public, DRIVE_ROOTS.private]
  if (driveRoots.some((root) => isWithin(path, root) && (receives || path !== root))) {
    return undefined
  }

  const area = path.startsWith('/pub/') ? '/pub/' : '/priv/'
  const [name] = path.slice(area.length).split('/')
  const isFolderName = path.length > area.length + name.length
  if (!name || !isFolderName) {
    return { folder: area as StoragePath, name: area.slice(0, -1), ownData: false }
  }
  return { folder: `${area}${name}/` as StoragePath, name, ownData: name === APP_ID }
}
