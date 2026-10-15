import type { Session } from '@synonymdev/pubky'
import {
  Clock,
  Copy,
  HardDrive,
  Globe,
  Lock,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { describeError } from '../drive/errors'
import type { Area, StoragePath } from '../drive/paths'
import { newMenuEntries } from '../features/actions/menus'
import { useItemActions } from '../features/actions/useItemActions'
import { BinView } from '../features/bin/BinView'
import { shortKey } from '../features/browse/format'
import { FolderView } from '../features/browse/FolderView'
import { MyDriveView } from '../features/browse/MyDriveView'
import { useDropTarget } from '../features/browse/dragAndDrop'
import { RecentView } from '../features/recent/RecentView'
import { SearchField } from '../features/search/SearchField'
import { SearchResultsView } from '../features/search/SearchResultsView'
import { copyText } from '../features/sharing/clipboard'
import { StarredView } from '../features/starred/StarredView'
import { UploadsProvider, useUploads } from '../features/upload/UploadsProvider'
import { Avatar } from '../ui/Avatar'
import { Dialog, DialogHostProvider, useDialogHost } from '../ui/Dialog'
import { Menu, type MenuAnchor, type MenuEntry } from '../ui/Menu'
import { useNotifier } from '../ui/Snackbar'
import { DriveProvider, useDrive } from './DriveContext'
import { AREA_LABELS } from './locations'
import { routeHash, useRoute, type Route } from './routes'
import { ViewPreferencesProvider, useViewPreferences } from './viewPreferences'
import './DriveApp.css'

interface DriveAppProps {
  session: Session
  onSignOut: () => Promise<void>
}

/** The signed-in app: header, sidebar and the view for the current route. */
export function DriveApp({ session, onSignOut }: DriveAppProps) {
  return (
    <DriveProvider session={session}>
      <ViewPreferencesProvider>
        <DialogHostProvider>
          <UploadsProvider>
            <Shell onSignOut={onSignOut} />
          </UploadsProvider>
        </DialogHostProvider>
      </ViewPreferencesProvider>
    </DriveProvider>
  )
}

function Shell({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const route = useRoute()
  useNarrowedAccessNotice()
  // The narrow-window sidebar closes when the route changes: it's open for one route only.
  const [sidebarOpenFor, setSidebarOpenFor] = useState<string>()
  const sidebarOpen = sidebarOpenFor === routeHash(route)
  useGlobalShortcuts(route)

  return (
    <div className={`shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <header className="shell-header">
        <button
          type="button"
          className="icon-button shell-menu-button"
          aria-label="Main menu"
          onClick={() => setSidebarOpenFor(sidebarOpen ? undefined : routeHash(route))}
        >
          <MenuIcon size={22} />
        </button>
        <a className="shell-logo" href={routeHash({ view: 'my-drive' })}>
          <HardDrive size={28} color="#0b57d0" aria-hidden />
          <span>Pubky Drive</span>
        </a>
        <SearchField
          key={route.view === 'search' ? route.query : ''}
          initialQuery={route.view === 'search' ? route.query : ''}
        />
        <AccountButton onSignOut={onSignOut} />
      </header>
      <Sidebar route={route} />
      <main className="shell-main">
        <RouteView route={route} />
      </main>
    </div>
  )
}

function RouteView({ route }: { route: Route }) {
  switch (route.view) {
    case 'folder':
      return (
        <FolderView key={`${route.area}/${route.folder}`} area={route.area} folder={route.folder} />
      )
    case 'recent':
      return <RecentView />
    case 'starred':
      return <StarredView />
    case 'bin':
      return <BinView />
    case 'search':
      return <SearchResultsView key={route.query} query={route.query} />
    default:
      return <MyDriveView />
  }
}

/** The folder that New and uploads use: the open folder, or the private area in other views. */
function useTargetFolder(route: Route): { folder?: StoragePath; caption?: string } {
  const { access } = useDrive()
  if (route.view === 'folder') {
    const root = access.roots[route.area]
    return { folder: root && ((route.folder ? `${root}${route.folder}/` : root) as StoragePath) }
  }
  const area: Area | undefined = access.roots.private
    ? 'private'
    : access.roots.public
      ? 'public'
      : undefined
  return { folder: area && access.roots[area], caption: area && `Adds to ${AREA_LABELS[area]}` }
}

function Sidebar({ route }: { route: Route }) {
  const { access } = useDrive()
  const actions = useItemActions()
  const uploads = useUploads()
  const { folder, caption } = useTargetFolder(route)
  const [menu, setMenu] = useState<MenuAnchor>()
  const current = route.view === 'folder' ? `folder:${route.area}` : route.view

  return (
    <nav className="sidebar" aria-label="Folders and views">
      <button
        type="button"
        className="new-button"
        disabled={!folder}
        onClick={(event) => setMenu({ element: event.currentTarget })}
      >
        <Plus size={24} /> New
      </button>
      {menu && folder && (
        <Menu
          label="New"
          anchor={menu}
          entries={newMenuEntries({
            actions,
            folder,
            caption,
            pickFiles: uploads.pickFiles,
            pickFolder: uploads.pickFolder,
          })}
          onClose={() => setMenu(undefined)}
        />
      )}

      <ul className="sidebar-nav">
        <NavItem
          icon={<HardDrive size={20} />}
          label="My Drive"
          route={{ view: 'my-drive' }}
          active={current === 'my-drive'}
        />
        {(['public', 'private'] as const).map((area) => (
          <NavItem
            key={area}
            indent
            icon={area === 'public' ? <Globe size={20} /> : <Lock size={20} />}
            label={AREA_LABELS[area]}
            route={{ view: 'folder', area, folder: '' }}
            active={current === `folder:${area}`}
            disabled={!access.roots[area]}
            dropTarget={access.roots[area]}
          />
        ))}
        <NavItem
          icon={<Clock size={20} />}
          label="Recent"
          route={{ view: 'recent' }}
          active={current === 'recent'}
        />
        <NavItem
          icon={<Star size={20} />}
          label="Starred"
          route={{ view: 'starred' }}
          active={current === 'starred'}
          disabled={!access.appData}
        />
        <NavItem
          icon={<Trash2 size={20} />}
          label="Bin"
          route={{ view: 'bin' }}
          active={current === 'bin'}
          disabled={!access.appData}
        />
      </ul>

      <div className="sidebar-access">
        <strong>
          {access.mode === 'entire-homeserver' ? 'Entire homeserver' : 'Drive folder'}
        </strong>
        <p>
          {access.mode === 'entire-homeserver'
            ? 'You can browse and change every file, including other apps’ data.'
            : 'Pubky Drive only sees the files it stores.'}
        </p>
      </div>
    </nav>
  )
}

interface NavItemProps {
  icon: ReactNode
  label: string
  route: Route
  active: boolean
  indent?: boolean
  disabled?: boolean
  dropTarget?: StoragePath
}

function NavItem({ icon, label, route, active, indent, disabled, dropTarget }: NavItemProps) {
  const { active: dropActive, dropProps } = useDropTarget(disabled ? undefined : dropTarget)
  return (
    <li>
      <a
        className={`sidebar-link ${active ? 'active' : ''} ${indent ? 'indent' : ''} ${dropActive ? 'drop-active' : ''}`}
        href={disabled ? undefined : routeHash(route)}
        aria-current={active ? 'page' : undefined}
        aria-disabled={disabled}
        {...dropProps}
      >
        {icon}
        <span>{label}</span>
      </a>
    </li>
  )
}

function AccountButton({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { ownerZ32, access } = useDrive()
  const { notify } = useNotifier()
  const [anchor, setAnchor] = useState<MenuAnchor>()
  const publicKey = `pubky${ownerZ32}`

  const entries: MenuEntry[] = [
    { type: 'caption', label: shortKey(publicKey) },
    {
      type: 'item',
      label: 'Copy public key',
      icon: Copy,
      onSelect: () => void copyText(publicKey).then(() => notify('Public key copied')),
    },
    {
      type: 'caption',
      label:
        access.mode === 'entire-homeserver' ? 'Access: entire homeserver' : 'Access: Drive folder',
    },
    { type: 'separator' },
    {
      type: 'item',
      label: 'Sign out',
      icon: LogOut,
      onSelect: () => void onSignOut().catch((error: unknown) => notify(describeError(error))),
    },
  ]

  return (
    <>
      <button
        type="button"
        className="account-button"
        aria-label={`Account ${shortKey(publicKey)}`}
        onClick={(event) => setAnchor({ element: event.currentTarget })}
      >
        <Avatar publicKey={ownerZ32} size={32} />
      </button>
      {anchor && (
        <Menu
          label="Account"
          anchor={anchor}
          entries={entries}
          onClose={() => setAnchor(undefined)}
        />
      )}
    </>
  )
}

/**
 * Tells the user once per session when Pubky Ring approved less than the app asked for, because
 * parts of the app are then unavailable. See docs/spec/11-sign-in.md.
 */
function useNarrowedAccessNotice() {
  const { access, ownerZ32 } = useDrive()
  const { notify } = useNotifier()

  useEffect(() => {
    const missing = [
      ...(['public', 'private'] as const)
        .filter((area) => !access.roots[area])
        .map((area) => AREA_LABELS[area]),
      ...(access.appData ? [] : ['Starred and Bin']),
    ]
    const key = `pubky-drive:narrowed-notice:${ownerZ32}`
    if (missing.length === 0 || sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, 'shown')
    notify(`Pubky Ring approved less access than requested. Unavailable: ${missing.join(', ')}.`, {
      persistent: true,
    })
  }, [access, ownerZ32, notify])
}

const CHORD_TIMEOUT_MS = 1500

/**
 * Shortcuts that work anywhere: `/` (search), ⌘/ (shortcuts), Ctrl+C then F/U/I (new folder,
 * upload files, upload folder) and ⌥V then L/D (layout, details).
 */
function useGlobalShortcuts(route: Route) {
  const actions = useItemActions()
  const uploads = useUploads()
  const { openDialog } = useDialogHost()
  const { layout, setLayout, detailsOpen, setDetailsOpen } = useViewPreferences()
  const { folder } = useTargetFolder(route)
  const chord = useRef<{ prefix: 'create' | 'view'; at: number }>(undefined)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, dialog, [role=menu]')) return

      const pending =
        chord.current && Date.now() - chord.current.at < CHORD_TIMEOUT_MS
          ? chord.current.prefix
          : undefined
      chord.current = undefined

      if (pending === 'create' && folder) {
        if (event.code === 'KeyF') actions.newFolder(folder)
        else if (event.code === 'KeyU') uploads.pickFiles(folder)
        else if (event.code === 'KeyI') uploads.pickFolder(folder)
        else return
      } else if (pending === 'view') {
        if (event.code === 'KeyL') setLayout(layout === 'list' ? 'grid' : 'list')
        else if (event.code === 'KeyD') setDetailsOpen(!detailsOpen)
        else return
      } else if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
        document.getElementById('search-input')?.focus()
      } else if (event.key === '/' && (event.metaKey || event.ctrlKey)) {
        openDialog((close) => <ShortcutsDialog onClose={close} />)
      } else if (event.ctrlKey && !event.metaKey && event.code === 'KeyC') {
        chord.current = { prefix: 'create', at: Date.now() }
        return
      } else if (event.altKey && event.code === 'KeyV') {
        chord.current = { prefix: 'view', at: Date.now() }
        event.preventDefault()
        return
      } else {
        return
      }
      event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions, uploads, openDialog, folder, layout, setLayout, detailsOpen, setDetailsOpen])
}

const SHORTCUT_GROUPS: [string, [string, string][]][] = [
  [
    'Selection',
    [
      ['Move selection', '↑ ↓ ← →'],
      ['Extend selection', 'Shift + arrows'],
      ['Select all', '⌘A'],
      ['Clear selection', 'Esc'],
    ],
  ],
  [
    'Navigation',
    [
      ['Open', 'Enter'],
      ['Go up one folder', '⌥↑'],
      ['Search', '/'],
    ],
  ],
  [
    'Actions',
    [
      ['Rename', 'F2'],
      ['Move to bin', 'Delete'],
      ['Move', '⌥⌘M'],
      ['Star or unstar', '⌥⌘S'],
      ['Preview', '⌥⌘P'],
      ['Copy link', '⌥⌘C'],
      ['More actions', 'Shift + F10'],
    ],
  ],
  [
    'Create',
    [
      ['New folder', 'Ctrl+C then F'],
      ['Upload files', 'Ctrl+C then U'],
      ['Upload folder', 'Ctrl+C then I'],
    ],
  ],
  [
    'View',
    [
      ['Toggle list and grid', '⌥V then L'],
      ['Show or hide details', '⌥V then D'],
      ['Show keyboard shortcuts', '⌘/'],
    ],
  ],
]

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      title="Keyboard shortcuts"
      width={560}
      onClose={onClose}
      onSubmit={onClose}
      actions={
        <button type="submit" className="button button-text">
          Close
        </button>
      }
    >
      <p className="dialog-message">⌘ is Ctrl on Windows and Linux.</p>
      {SHORTCUT_GROUPS.map(([group, shortcuts]) => (
        <section key={group} className="shortcut-group">
          <h3>{group}</h3>
          <dl>
            {shortcuts.map(([action, keys]) => (
              <div key={action}>
                <dt>{action}</dt>
                <dd>
                  <kbd>{keys}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </Dialog>
  )
}
