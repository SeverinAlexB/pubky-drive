import { ArrowLeft, ChevronRight, LoaderCircle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useDrive } from '../../app/DriveContext'
import { useLoad } from '../../app/useLoad'
import { AREA_LABELS, folderLabel, HOMESERVER_AREA_LABELS, isAreaRoot } from '../../app/locations'
import { canWrite, HOMESERVER_ROOTS, type DriveAccess } from '../../drive/access'
import { describeError } from '../../drive/errors'
import type { DriveItem } from '../../drive/items'
import { areaOfPath, isWithin, nameOf, parentOf, type StoragePath } from '../../drive/paths'
import { Dialog } from '../../ui/Dialog'
import { FileIcon } from '../../ui/FileIcon'
import './MoveDialog.css'

interface MoveDialogProps {
  items: DriveItem[]
  onMove: (target: StoragePath) => Promise<void>
  onClose: () => void
}

/** `undefined` browses the top level, where the two areas are listed. */
type Browsed = StoragePath | undefined

/** Chooses a destination folder. See docs/spec/06-organise.md, "Move". */
export function MoveDialog({ items, onMove, onClose }: MoveDialogProps) {
  const { drive, access } = useDrive()
  const currentFolder = parentOf(items[0].path)
  const [browsed, setBrowsed] = useState<Browsed>(
    isAreaRoot(currentFolder) ? undefined : parentOf(currentFolder),
  )
  const [selected, setSelected] = useState<StoragePath>()
  const [moveError, setMoveError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const loadFolders = useCallback(async () => {
    if (browsed === undefined) return topLevelFolders(access)
    return (await drive.listFolder(browsed)).filter((item) => item.kind === 'folder')
  }, [browsed, drive, access])
  const { data: folders, error: listError } = useLoad(loadFolders)
  const error = moveError ?? listError

  const browse = (folder: Browsed) => {
    setBrowsed(folder)
    setSelected(undefined)
  }

  const target = selected ?? browsed
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
      <div className="move-browser">
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
              ? 'My Drive'
              : isAreaRoot(browsed)
                ? folderLabel(browsed)
                : nameOf(browsed)}
          </strong>
        </div>
        <ul className="move-folders" role="listbox" aria-label="Folders">
          {folders === undefined && !error && (
            <li className="move-placeholder">
              <LoaderCircle className="spinner" size={20} /> Loading…
            </li>
          )}
          {folders?.length === 0 && <li className="move-placeholder">No folders</li>}
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
                <span className="move-folder-name">{folder.name}</span>
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
        {target ? <>Move to: {folderLabel(target)}</> : 'Select a folder'}
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
