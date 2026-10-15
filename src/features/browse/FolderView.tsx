import { ChevronDown, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useDrive } from '../../app/DriveContext'
import { AREA_LABELS, folderRoute } from '../../app/locations'
import { navigate } from '../../app/routes'
import { useLoad } from '../../app/useLoad'
import { itemFromPath } from '../../drive/items'
import { parentOf, type Area, type StoragePath } from '../../drive/paths'
import { followEvents } from '../../pubky/events'
import { Menu, separator, type MenuEntry } from '../../ui/Menu'
import { itemMenuEntries, newMenuEntries } from '../actions/menus'
import { useItemActions } from '../actions/useItemActions'
import { useViewPreferences } from '../../app/viewPreferences'
import { useUploads } from '../upload/UploadsProvider'
import { useDropTarget } from './dragAndDrop'
import { ItemBrowser } from './ItemBrowser'

interface FolderViewProps {
  area: Area
  /** The folder's path inside the area root, '' for the root. */
  folder: string
}

/** One folder's contents, kept up to date by the event stream. See docs/spec/02-navigation.md. */
export function FolderView({ area, folder }: FolderViewProps) {
  const { drive, access, session, version } = useDrive()
  const root = access.roots[area]
  const path = root && ((folder ? `${root}${folder}/` : root) as StoragePath)
  const [liveVersion, setLiveVersion] = useState(0)

  const load = useCallback(
    () => (path ? drive.listFolder(path) : Promise.resolve([])),
    [drive, path],
  )
  // Reload after changes made here (`version`) and elsewhere (`liveVersion`).
  const { data: items, error, retry } = useLoad(load, `${version}:${liveVersion}`)

  useEffect(() => {
    if (!path) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let stop: (() => Promise<void>) | undefined
    let active = true

    followEvents(session, path, () => {
      clearTimeout(timer)
      timer = setTimeout(() => setLiveVersion((current) => current + 1), 400)
    }).then(
      (stopFollowing) => {
        if (active) stop = stopFollowing
        else void stopFollowing()
      },
      (followError: unknown) => console.warn('Live updates are unavailable', followError),
    )

    return () => {
      active = false
      clearTimeout(timer)
      void stop?.()
    }
  }, [session, path])

  if (!root || !path) {
    return (
      <div className="browser-state">
        <h2>No access to {AREA_LABELS[area]}</h2>
        <p>
          This session can’t read or write the {AREA_LABELS[area].toLowerCase()} area. Sign out and
          sign in again to grant access.
        </p>
      </div>
    )
  }

  const goUp = () =>
    navigate(path === root ? { view: 'my-drive' } : folderRoute(parentOf(path), access))

  return (
    <ItemBrowser
      key={path}
      title={<Breadcrumbs area={area} root={root} path={path} />}
      items={items}
      error={error}
      onRetry={retry}
      columns="owner"
      folder={path}
      onGoUp={goUp}
      emptyState={
        <>
          <h2>Drop files here</h2>
          <p>or use the New button.</p>
        </>
      }
    />
  )
}

interface BreadcrumbsProps {
  area: Area
  root: StoragePath
  path: StoragePath
}

/** `My Drive › Public › photos ▾`. Earlier segments open their folder and accept dropped items. */
function Breadcrumbs({ area, root, path }: BreadcrumbsProps) {
  const { access, starred } = useDrive()
  const actions = useItemActions()
  const uploads = useUploads()
  const { setDetailsOpen } = useViewPreferences()
  const [menu, setMenu] = useState<{ element: Element; entries: MenuEntry[] }>()

  const segments = path.slice(root.length).split('/').filter(Boolean)
  const crumbs: { label: string; folder?: StoragePath }[] = [
    { label: 'My Drive' },
    { label: AREA_LABELS[area], folder: root },
    ...segments.map((segment, index) => ({
      label: segment,
      folder: `${root}${segments.slice(0, index + 1).join('/')}/` as StoragePath,
    })),
  ]
  const last = crumbs[crumbs.length - 1]

  const currentFolderMenu = (): MenuEntry[] => {
    const newEntries = newMenuEntries({
      actions,
      folder: path,
      pickFiles: uploads.pickFiles,
      pickFolder: uploads.pickFolder,
    })
    if (path === root) return newEntries
    const folderEntries = itemMenuEntries([itemFromPath(path)], {
      actions,
      access,
      starred,
      preview: () => {},
      showDetails: () => setDetailsOpen(true),
    }).filter((entry) => entry.type !== 'item' || entry.label !== 'Download')
    return [...newEntries, separator, ...folderEntries]
  }

  return (
    <nav className="breadcrumbs" aria-label="Folder path">
      {crumbs.slice(0, -1).map((crumb, index) => (
        <span key={crumb.folder ?? 'my-drive'} className="breadcrumb-part">
          <Crumb
            label={crumb.label}
            folder={crumb.folder}
            collapsed={crumbs.length > 4 && index > 0 && index < crumbs.length - 3}
            onOpen={() =>
              navigate(crumb.folder ? folderRoute(crumb.folder, access) : { view: 'my-drive' })
            }
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
