import type { DriveItem } from '../../drive/items'
import type { Scope } from '../../app/routes'
import type { Area, StoragePath } from '../../drive/paths'
import type { BinEntry } from '../bin/bin'

/** A row in a file list: a drive item, an area folder in Pubky Drive, or a bin entry. */
export interface ListItem extends DriveItem {
  /** Set for the Public and Private folders that Pubky Drive lists. */
  areaRoot?: Area
  /** Set for items in the bin. */
  binEntry?: BinEntry
  /** For Recent, Starred and search: the folder the item is in. */
  location?: StoragePath
  /** A short note after the name, such as "Pubky Drive" for the app's own folder in the Homeserver section. */
  badge?: string
  /** A sentence about the item for the details pane, such as what a folder marker does. */
  note?: string
  /** The section a folder opens in. Without it, the section its data belongs to. */
  scope?: Scope
}
