import type { DriveItem } from '../../drive/items'
import type { Area, StoragePath } from '../../drive/paths'
import type { BinEntry } from '../bin/bin'

/** A row in a file list: a drive item, an area folder in My Drive, or a bin entry. */
export interface ListItem extends DriveItem {
  /** Set for the Public and Private folders that My Drive lists. */
  areaRoot?: Area
  /** Set for items in the bin. */
  binEntry?: BinEntry
  /** For Recent, Starred and search: the folder the item is in. */
  location?: StoragePath
}
