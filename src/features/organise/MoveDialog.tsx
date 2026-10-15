import { ArrowLeft, ChevronRight, LoaderCircle, Search, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useDrive } from '../../app/DriveContext'
import { useLoad } from '../../app/useLoad'
import { AREA_LABELS, folderLabel, HOMESERVER_AREA_LABELS, isAreaRoot } from '../../app/locations'
import { canWrite, HOMESERVER_ROOTS, type DriveAccess } from '../../drive/access'
import { describeError } from '../../drive/errors'
import type { DriveItem } from '../../drive/items'
import { areaOfPath, isWithin, nameOf, parentOf, type StoragePath } from '../../drive/paths'
import { Dialog } from '../../ui/Dialog'
import { sleep } from '../../pubky/backoff'
import { FileIcon } from '../../ui/FileIcon'
import { matchByName } from '../search/search'
import { starredFolders, recentFolders } from './moveTargets'
import './MoveDialog.css'

interface MoveDialogProps {
  items: DriveItem[]
  onMove: (target: StoragePath) => Promise<void>
  onClose: () => void
}

/** `undefined` browses the top level, where the two areas are listed. */
type Browsed = StoragePath | undefined

type Tab = 'recent' | 'starred' | 'browse'

const HISTORY_WAIT_MS = 2000

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'recent', label: 'Recent' },
  { tab: 'starred', label: 'Starred' },
  { tab: 'browse', label: 'Browse' },
]

/** Chooses a destination folder. See docs/spec/06-organise.md, "Move". */
export function MoveDialog({ items, onMove, onClose }: MoveDialogProps) {
  const { drive, access, events, starred, loadSearchIndex } = useDrive()
  const [tab, setTab] = useState<Tab>('recent')
  /** The search field's text; `undefined` while the field is closed. */
  const [query, setQuery] = useState<string>()
  const currentFolder = parentOf(items[0].path)
  const [browsed, setBrowsed] = useState<Browsed>(
    isAreaRoot(currentFolder) ? undefined : parentOf(currentFolder),
  )
  const [selected, setSelected] = useState<StoragePath>()
  const [moveError, setMoveError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const searching = query !== undefined && query.trim() !== ''
  const loadFolders = useCallback(async (): Promise<FolderOption[]> => {
    if (tab === 'browse' && !searching) {
      if (browsed === undefined) return topLevelFolders(access)
      return (await drive.listFolder(browsed)).filter((item) => item.kind === 'folder')
    }
    // The other lists come from every Drive folder, which search keeps cached.
    const everyFolder = (await loadSearchIndex()).filter((item) => item.kind === 'folder')
    let folders = matchByName(everyFolder, query ?? '')
    if (!searching && tab === 'starred') folders = starredFolders(starred, everyFolder)
    if (!searching && tab === 'recent') {
      // The history may still wait for the homeserver's rate limit; use what's known.
      await Promise.race([events.ready, sleep(HISTORY_WAIT_MS)])
      folders = recentFolders(events.history(), everyFolder, currentFolder)
    }
    return folders.map((folder) => ({ ...folder, location: folderLabel(parentOf(folder.path)) }))
  }, [
    tab,
    searching,
    query,
    browsed,
    access,
    drive,
    loadSearchIndex,
    starred,
    events,
    currentFolder,
  ])
  const { data: folders, error: listError } = useLoad(loadFolders)
  const error = moveError ?? listError
  const browsing = tab === 'browse' && !searching

  const browse = (folder: Browsed) => {
    setTab('browse')
    setQuery(undefined)
    setBrowsed(folder)
    setSelected(undefined)
  }

  const showTab = (next: Tab) => {
    setTab(next)
    setQuery(undefined)
    setSelected(undefined)
  }

  // Browsing a folder offers it as the target; the other lists need a choice.
  const target = selected ?? (browsing ? browsed : undefined)
  const problem = target && moveProblem(items, target, access)
  const crossesAreas = target && items.some((item) => areaOfPath(item.path) !== areaOfPath(target))

  const submit = async () => {
    if (!target || problem || busy) return
    setBusy(true)
    try {
      await onMove(target)
      onClose()
    } catch (caught) {
      setMoveError(describeError(caught))
      setBusy(false)
    }
  }

  const goUp = () => {
    if (browsed === undefined) return
    browse(isAreaRoot(browsed) ? undefined : parentOf(browsed))
  }

  return (
    <Dialog
      width={600}
      title={items.length === 1 ? `Move ‘${items[0].name}’` : `Move ${items.length} items`}
      onClose={onClose}
      onSubmit={submit}
      actions={
        <>
          <button type="button" className="button button-text" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="button button-filled"
            disabled={!target || Boolean(problem) || busy}
          >
            Move
          </button>
        </>
      }
    >
      <p className="move-current">
        Current location: <span className="move-chip">{folderLabel(currentFolder)}</span>
      </p>
      <div className="move-tabs">
        {query === undefined ? (
          <>
            <div role="tablist" aria-label="Locations">
              {TABS.map(({ tab: each, label }) => (
                <button
                  key={each}
                  type="button"
                  role="tab"
                  aria-selected={tab === each}
                  className="move-tab"
                  onClick={() => showTab(each)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="icon-button small"
              aria-label="Search"
              onClick={() => setQuery('')}
            >
              <Search size={20} />
            </button>
          </>
        ) : (
          <div className="move-search">
            <Search size={20} aria-hidden />
            <input
              autoFocus
              aria-label="Search folders"
              placeholder="Search folders"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSelected(undefined)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setQuery(undefined)
                }
                // Enter picks a folder from the list, not the dialog's Move button.
                if (event.key === 'Enter') event.preventDefault()
              }}
            />
            <button
              type="button"
              className="icon-button small"
              aria-label="Close search"
              onClick={() => setQuery(undefined)}
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
      <div className="move-browser">
        {browsing && (
          <div className="move-browser-header">
            <button
              type="button"
              className="icon-button small"
              aria-label="Back"
              disabled={browsed === undefined}
              onClick={goUp}
            >
              <ArrowLeft size={20} />
            </button>
            <strong>
              {browsed === undefined
                ? 'Pubky Drive'
                : isAreaRoot(browsed)
                  ? folderLabel(browsed)
                  : nameOf(browsed)}
            </strong>
          </div>
        )}
        <ul className="move-folders" role="listbox" aria-label="Folders">
          {folders === undefined && !error && (
            <li className="move-placeholder">
              <LoaderCircle className="spinner" size={20} /> Loading…
            </li>
          )}
          {folders?.length === 0 && (
            <li className="move-placeholder">
              {searching
                ? 'No folders match your search'
                : tab === 'recent'
                  ? 'No recent folders'
                  : tab === 'starred'
                    ? 'No starred folders'
                    : 'No folders'}
            </li>
          )}
          {folders?.map((folder) => {
            // A folder that can't be the target can still be opened to move into a subfolder.
            const unselectable = Boolean(moveProblem(items, folder.path, access))
            const area = isAreaRoot(folder.path) ? areaOfPath(folder.path) : undefined
            return (
              <li
                key={folder.path}
                role="option"
                aria-selected={selected === folder.path}
                className={`move-folder ${unselectable ? 'unselectable' : ''}`}
                tabIndex={0}
                onClick={() => !unselectable && setSelected(folder.path)}
                onDoubleClick={() => browse(folder.path)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === 'ArrowRight') {
                    event.preventDefault()
                    browse(folder.path)
                  }
                }}
              >
                <FileIcon item={folder} areaRoot={area} />
                <span className="move-folder-name">
                  {folder.name}
                  {folder.location && (
                    <span className="move-folder-location">{folder.location}</span>
                  )}
                </span>
                <button
                  type="button"
                  className="icon-button small"
                  aria-label={`Open ${folder.name}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    browse(folder.path)
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="move-target">
        {target ? <>Move to: {folderLabel(target)}</> : 'Choose a folder'}
      </p>
      {problem && <p className="field-error">{problem}</p>}
      {!problem && crossesAreas && (
        <p className="move-warning">
          {areaOfPath(target!) === 'public'
            ? 'These items will become public. Anyone with the address can read them.'
            : 'These items will become private. Copies others already downloaded stay with them.'}
        </p>
      )}
      {error && <p className="field-error">{error}</p>}
    </Dialog>
  )
}

/** A folder in the list, with its location when the list mixes folders from many places. */
type FolderOption = DriveItem & { location?: string }

/** Why the items can't move into `target`, or `undefined` when they can. */
function moveProblem(items: DriveItem[], target: StoragePath, access: DriveAccess) {
  if (!canWrite(access, target)) return 'This folder is read only.'
  if (items.some((item) => item.kind === 'folder' && isWithin(target, item.path))) {
    return 'A folder can’t be moved into itself.'
  }
  if (items.every((item) => parentOf(item.path) === target)) return 'The items are already here.'
  return undefined
}

/** The top level: the Drive areas, then the homeserver roots when the session may change them. */
function topLevelFolders(access: DriveAccess): DriveItem[] {
  const areas = ['public', 'private'] as const
  const drive = areas.flatMap((area) => {
    const root = access.roots[area]
    return root ? [{ kind: 'folder' as const, path: root, name: AREA_LABELS[area], area }] : []
  })
  const homeserver = areas.flatMap((area) =>
    access.homeserver[area] === 'manage'
      ? [
          {
            kind: 'folder' as const,
            path: HOMESERVER_ROOTS[area],
            name: HOMESERVER_AREA_LABELS[area],
            area,
          },
        ]
      : [],
  )
  return [...drive, ...homeserver]
}
