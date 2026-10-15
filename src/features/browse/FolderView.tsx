import { ChevronDown, ChevronRight } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useDrive } from '../../app/DriveContext'
import { areaLabel, folderLabel, folderRoute } from '../../app/locations'
import { navigate, type Route, type Scope } from '../../app/routes'
import { useLiveChanges } from '../../app/useLiveChanges'
import { useLoad } from '../../app/useLoad'
import { useViewPreferences } from '../../app/viewPreferences'
import { APP_ID } from '../../config'
import { canWrite, DRIVE_ROOTS, HOMESERVER_ROOTS } from '../../drive/access'
import { itemFromPath } from '../../drive/items'
import { parentOf, type Area, type StoragePath } from '../../drive/paths'
import { Menu, separator, type MenuEntry } from '../../ui/Menu'
import { itemMenuEntries, newMenuEntries } from '../actions/menus'
import { useItemActions } from '../actions/useItemActions'
import { HomeserverBanner, HomeserverLocked } from '../homeserver/HomeserverNotices'
import { useUploads } from '../upload/UploadsProvider'
import { useDropTarget } from './dragAndDrop'
import { ItemBrowser } from './ItemBrowser'
import type { ListItem } from './listItem'

interface FolderViewProps {
  scope: Scope
  area: Area
  /** The folder's path inside the area root, '' for the root. */
  folder: string
}

/**
 * One folder's contents in My Drive or the Homeserver section, kept up to date by the event
 * stream. See docs/spec/02-navigation.md.
 */
export function FolderView({ scope, area, folder }: FolderViewProps) {
  const { drive, access, version } = useDrive()
  const root =
    scope === 'drive' ? access.roots[area] : access.homeserver[area] && HOMESERVER_ROOTS[area]
  const path = root && ((folder ? `${root}${folder}/` : root) as StoragePath)

  const load = useCallback(async (): Promise<ListItem[] | 'missing'> => {
    if (!path) return []
    // An area root is simply empty until it has files; any other folder can disappear.
    const items =
      path === root ? await drive.listFolder(path) : await drive.listFolderIfExists(path)
    if (!items) return 'missing'
    return scope === 'homeserver' ? items.map(withHomeserverBadge) : items
  }, [drive, path, root, scope])
  // Reload after changes made here (`version`) and elsewhere (`liveChanges`).
  const liveChanges = useLiveChanges(path ? [path] : [])
  const { data, error, retry } = useLoad(load, `${version}:${liveChanges}`)

  if (!root || !path) {
    if (scope === 'homeserver') return <HomeserverLocked />
    return (
      <div className="browser-state">
        <h2>No access to {areaLabel(scope, area)}</h2>
        <p>
          This session can’t read or write this area. Sign out and sign in again to grant access.
        </p>
      </div>
    )
  }

  const sectionRoute: Route = scope === 'drive' ? { view: 'my-drive' } : { view: 'homeserver' }
  const goUp = () => navigate(path === root ? sectionRoute : folderRoute(parentOf(path)))
  const writable = canWrite(access, path)

  if (data === 'missing') {
    return (
      <div className="browser-state">
        <h2>This folder no longer exists</h2>
        <p>It may have been moved, renamed or deleted, here or in another app.</p>
        <button type="button" className="button button-outlined" onClick={goUp}>
          Open {folderLabel(parentOf(path))}
        </button>
      </div>
    )
  }

  return (
    <ItemBrowser
      key={path}
      title={<Breadcrumbs scope={scope} area={area} root={root} path={path} writable={writable} />}
      items={data}
      error={error}
      onRetry={retry}
      columns="owner"
      folder={writable ? path : undefined}
      onGoUp={goUp}
      banner={scope === 'homeserver' ? <HomeserverBanner /> : undefined}
      emptyState={
        writable ? (
          <>
            <h2>Drop files here</h2>
            <p>or use the New button.</p>
          </>
        ) : (
          <p>This folder is empty.</p>
        )
      }
    />
  )
}

/** Marks the folders that belong to Pubky Drive, so they're recognisable among other apps' data. */
function withHomeserverBadge(item: ListItem): ListItem {
  if (item.path === `/pub/${APP_ID}/` || item.path === `/priv/${APP_ID}/`) {
    return { ...item, badge: 'Pubky Drive' }
  }
  if (item.path === DRIVE_ROOTS.public || item.path === DRIVE_ROOTS.private) {
    return { ...item, badge: 'Opens in My Drive' }
  }
  return item
}

interface BreadcrumbsProps {
  scope: Scope
  area: Area
  root: StoragePath
  path: StoragePath
  writable: boolean
}

/**
 * `My Drive › Public › photos ▾` or `Homeserver › /pub › pubky.app ▾`. Earlier segments open their
 * folder and accept dropped items.
 */
function Breadcrumbs({ scope, area, root, path, writable }: BreadcrumbsProps) {
  const { access, starred } = useDrive()
  const actions = useItemActions()
  const uploads = useUploads()
  const { setDetailsOpen } = useViewPreferences()
  const [menu, setMenu] = useState<{ element: Element; entries: MenuEntry[] }>()

  const crumbs = useMemo(() => {
    const segments = path.slice(root.length).split('/').filter(Boolean)
    return [
      { label: scope === 'drive' ? 'My Drive' : 'Homeserver' },
      { label: areaLabel(scope, area), folder: root },
      ...segments.map((segment, index) => ({
        label: segment,
        folder: `${root}${segments.slice(0, index + 1).join('/')}/` as StoragePath,
      })),
    ] as { label: string; folder?: StoragePath }[]
  }, [scope, area, root, path])
  const last = crumbs[crumbs.length - 1]

  const currentFolderMenu = (): MenuEntry[] => {
    const newEntries = writable
      ? newMenuEntries({
          actions,
          folder: path,
          pickFiles: uploads.pickFiles,
          pickFolder: uploads.pickFolder,
        })
      : []
    if (path === root)
      return newEntries.length > 0 ? newEntries : [{ type: 'caption', label: 'Read only' }]
    const folderEntries = itemMenuEntries([itemFromPath(path)], {
      actions,
      access,
      starred,
      preview: () => {},
      showDetails: () => setDetailsOpen(true),
    }).filter((entry) => entry.type !== 'item' || entry.label !== 'Download')
    return newEntries.length > 0 ? [...newEntries, separator, ...folderEntries] : folderEntries
  }

  const sectionRoute: Route = scope === 'drive' ? { view: 'my-drive' } : { view: 'homeserver' }

  return (
    <nav className="breadcrumbs" aria-label="Folder path">
      {crumbs.slice(0, -1).map((crumb, index) => (
        <span key={crumb.folder ?? 'section'} className="breadcrumb-part">
          <Crumb
            label={crumb.label}
            folder={crumb.folder}
            collapsed={crumbs.length > 4 && index > 0 && index < crumbs.length - 3}
            onOpen={() => navigate(crumb.folder ? folderRoute(crumb.folder) : sectionRoute)}
          />
          <ChevronRight size={20} className="breadcrumb-separator" aria-hidden />
        </span>
      ))}
      <h1 className="breadcrumb-heading">
        <button
          type="button"
          className="breadcrumb-current"
          aria-haspopup="menu"
          onClick={(event) =>
            setMenu({ element: event.currentTarget, entries: currentFolderMenu() })
          }
        >
          <span>{last.label}</span>
          <ChevronDown size={20} />
        </button>
      </h1>
      {menu && (
        <Menu
          entries={menu.entries}
          anchor={{ element: menu.element }}
          label="Folder actions"
          onClose={() => setMenu(undefined)}
        />
      )}
    </nav>
  )
}

function Crumb(props: {
  label: string
  folder?: StoragePath
  collapsed: boolean
  onOpen: () => void
}) {
  const { active, dropProps } = useDropTarget(props.folder)
  return (
    <button
      type="button"
      className={`breadcrumb ${active ? 'drop-active' : ''}`}
      title={props.label}
      onClick={props.onOpen}
      {...dropProps}
    >
      {props.collapsed ? '…' : props.label}
    </button>
  )
}
