// The entries of the item, bin and New menus. See docs/spec/04-menus-and-shortcuts.md.

import {
  Download,
  Eye,
  FolderInput,
  FolderPlus,
  FolderUp,
  Info,
  Link,
  Pencil,
  Copy,
  RotateCcw,
  Star,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react'
import type { DriveAccess } from '../../drive/access'
import type { StoragePath } from '../../drive/paths'
import { separator, type MenuEntry } from '../../ui/Menu'
import type { ListItem } from '../browse/listItem'
import type { ItemActions } from './useItemActions'

export interface ItemMenuContext {
  actions: ItemActions
  access: DriveAccess
  starred: ReadonlySet<StoragePath>
  preview: (item: ListItem) => void
  showDetails: () => void
}

/** The context menu for the selected items. */
export function itemMenuEntries(items: ListItem[], context: ItemMenuContext): MenuEntry[] {
  if (items.some((item) => item.binEntry)) return binMenuEntries(items, context.actions)
  if (items.some((item) => item.areaRoot)) return []

  const { actions, access, starred } = context
  const single = items.length === 1 ? items[0] : undefined
  const allStarred = items.every((item) => starred.has(item.path))
  const anyPublic = items.some((item) => item.area === 'public')

  return [
    ...(single?.kind === 'file'
      ? [
          {
            type: 'item' as const,
            label: 'Preview',
            icon: Eye,
            shortcut: '⌥⌘P',
            onSelect: () => context.preview(single),
          },
          separator,
        ]
      : []),
    {
      type: 'item',
      label: 'Download',
      icon: Download,
      onSelect: () => void actions.download(items),
    },
    {
      type: 'item',
      label: 'Rename',
      icon: Pencil,
      shortcut: 'F2',
      disabled: !single,
      onSelect: () => single && actions.rename(single),
    },
    ...(single?.kind === 'file' || !single
      ? [
          {
            type: 'item' as const,
            label: 'Make a copy',
            icon: Copy,
            disabled: !single,
            onSelect: () => single && void actions.makeCopy(single),
          },
        ]
      : []),
    separator,
    {
      type: 'submenu',
      label: 'Share',
      icon: UserPlus,
      entries: [
        {
          type: 'item',
          label: 'Share',
          icon: UserPlus,
          disabled: !single,
          onSelect: () => single && actions.share(single),
        },
        {
          type: 'item',
          label: items.length > 1 ? 'Copy links' : 'Copy link',
          icon: Link,
          shortcut: '⌥⌘C',
          disabled: !anyPublic,
          onSelect: () => void actions.copyLink(items),
        },
      ],
    },
    {
      type: 'submenu',
      label: 'Organise',
      icon: FolderInput,
      entries: [
        {
          type: 'item',
          label: 'Move',
          icon: FolderInput,
          shortcut: '⌥⌘M',
          onSelect: () => actions.move(items),
        },
        {
          type: 'item',
          label: allStarred ? 'Remove from starred' : 'Add to starred',
          icon: Star,
          shortcut: '⌥⌘S',
          disabled: !access.appData,
          onSelect: () => void actions.toggleStar(items),
        },
      ],
    },
    {
      type: 'submenu',
      label: items.some((item) => item.kind === 'folder')
        ? 'Folder information'
        : 'File information',
      icon: Info,
      disabled: !single,
      entries: [
        {
          type: 'item',
          label: 'Details',
          icon: Info,
          shortcut: '⌥V D',
          onSelect: context.showDetails,
        },
      ],
    },
    separator,
    access.appData
      ? {
          type: 'item',
          label: 'Move to bin',
          icon: Trash2,
          shortcut: 'Delete',
          onSelect: () => void actions.moveToBin(items),
        }
      : {
          type: 'item',
          label: 'Delete forever',
          icon: Trash2,
          shortcut: 'Delete',
          onSelect: () => void actions.deleteForever(items),
        },
  ]
}

function binMenuEntries(items: ListItem[], actions: ItemActions): MenuEntry[] {
  const entries = items.flatMap((item) => (item.binEntry ? [item.binEntry] : []))
  return [
    {
      type: 'item',
      label: 'Restore',
      icon: RotateCcw,
      onSelect: () => void actions.restore(entries),
    },
    separator,
    {
      type: 'item',
      label: 'Delete forever',
      icon: Trash2,
      onSelect: () => void actions.deleteBinEntries(entries),
    },
  ]
}

export interface NewMenuContext {
  actions: ItemActions
  folder: StoragePath
  pickFiles: (folder: StoragePath) => void
  pickFolder: (folder: StoragePath) => void
  /** Shown above the entries, such as "Adds to Private" in My Drive. */
  caption?: string
}

export function newMenuEntries({
  actions,
  folder,
  pickFiles,
  pickFolder,
  caption,
}: NewMenuContext): MenuEntry[] {
  return [
    ...(caption ? [{ type: 'caption' as const, label: caption }] : []),
    {
      type: 'item',
      label: 'New folder',
      icon: FolderPlus,
      shortcut: '⌃C F',
      onSelect: () => actions.newFolder(folder),
    },
    separator,
    {
      type: 'item',
      label: 'File upload',
      icon: Upload,
      shortcut: '⌃C U',
      onSelect: () => pickFiles(folder),
    },
    {
      type: 'item',
      label: 'Folder upload',
      icon: FolderUp,
      shortcut: '⌃C I',
      onSelect: () => pickFolder(folder),
    },
  ]
}
