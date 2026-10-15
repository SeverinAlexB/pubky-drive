import {
  ArrowDownUp,
  Check,
  Download,
  FolderInput,
  Info,
  LayoutGrid,
  Link,
  List,
  RotateCcw,
  Trash2,
  UserPlus,
  X,
  EllipsisVertical,
} from 'lucide-react'
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useDrive } from '../../app/DriveContext'
import { folderRoute } from '../../app/locations'
import { navigate } from '../../app/routes'
import { useViewPreferences } from '../../app/viewPreferences'
import { canWrite } from '../../drive/access'
import { fileTypeOf, type DriveItem, type FileType } from '../../drive/items'
import type { StoragePath } from '../../drive/paths'
import { Menu, separator, type MenuAnchor, type MenuEntry } from '../../ui/Menu'
import { useNotifier } from '../../ui/Snackbar'
import { itemMenuEntries } from '../actions/menus'
import { useItemActions } from '../actions/useItemActions'
import { DetailsPane } from '../details/DetailsPane'
import { Preview } from '../preview/Preview'
import { startItemDrag, useDropTarget } from './dragAndDrop'
import { GridLayout, ListLayout, type ColumnSet } from './ItemRows'
import type { ListItem } from './listItem'
import { useSelection } from './selection'
import { DEFAULT_SORT, sortItems, type SortKey, type SortOrder } from './sorting'
import './ItemBrowser.css'

interface ItemBrowserProps {
  /** The title row content: a heading or breadcrumbs. */
  title: ReactNode
  /** `undefined` while loading. */
  items: ListItem[] | undefined
  error?: string
  onRetry?: () => void
  columns: ColumnSet
  /** The open folder. Files dropped from the computer upload into it. */
  folder?: StoragePath
  /** Groups rows under headings, for Recent and the bin. Turns off sorting. */
  groupBy?: (item: ListItem) => string
  emptyState: ReactNode
  /** Shown between the filter bar and the list, such as the bin notice. */
  banner?: ReactNode
  /** Opens the parent folder (⌥↑). */
  onGoUp?: () => void
}

const TYPE_FILTERS: { type: FileType; label: string }[] = [
  { type: 'folder', label: 'Folders' },
  { type: 'image', label: 'Images' },
  { type: 'pdf', label: 'PDFs' },
  { type: 'text', label: 'Text and code' },
  { type: 'audio', label: 'Audio' },
  { type: 'video', label: 'Video' },
  { type: 'archive', label: 'Archives' },
  { type: 'other', label: 'Other' },
]

/** A file list with selection, menus, details and preview. See docs/spec/03-file-list.md. */
export function ItemBrowser({
  title,
  items,
  error,
  onRetry,
  columns,
  folder,
  groupBy,
  emptyState,
  banner,
  onGoUp,
}: ItemBrowserProps) {
  const { drive, access, starred } = useDrive()
  const actions = useItemActions()
  const { notify } = useNotifier()
  const { layout, setLayout, detailsOpen, setDetailsOpen } = useViewPreferences()
  const [sort, setSort] = useState<SortOrder>(DEFAULT_SORT)
  const [typeFilter, setTypeFilter] = useState<FileType>()
  const [menu, setMenu] = useState<{ anchor: MenuAnchor; entries: MenuEntry[]; label: string }>()
  const [previewPath, setPreviewPath] = useState<StoragePath>()
  const listRef = useRef<HTMLDivElement>(null)
  const { active: dropActive, dropProps } = useDropTarget(folder)

  const displayed = useMemo(() => {
    const filtered = (items ?? []).filter((item) => !typeFilter || fileTypeOf(item) === typeFilter)
    return groupBy ? filtered : sortItems(filtered, sort)
  }, [items, typeFilter, sort, groupBy])
  const order = useMemo(() => displayed.map((item) => item.path), [displayed])
  const selection = useSelection(order)
  const selectedItems = useMemo(
    () => displayed.filter((item) => selection.selected.has(item.path)),
    [displayed, selection.selected],
  )
  const previewFiles = useMemo(
    () => displayed.filter((item) => item.kind === 'file' && !item.binEntry),
    [displayed],
  )
  const previewIndex = previewFiles.findIndex((item) => item.path === previewPath)
  const loadBytes = useCallback((item: DriveItem) => drive.files.getBytes(item.path), [drive])

  const open = (item: ListItem) => {
    if (item.binEntry) notify('To open this item, restore it from the bin first.')
    else if (item.kind === 'folder') navigate(folderRoute(item.path))
    else setPreviewPath(item.path)
  }

  const menuContext = {
    actions,
    access,
    starred,
    preview: (item: ListItem) => setPreviewPath(item.path),
    showDetails: () => setDetailsOpen(true),
  }

  const openMenu = (anchor: MenuAnchor, forItems: ListItem[]) => {
    const entries = itemMenuEntries(forItems, menuContext)
    if (entries.length > 0) setMenu({ anchor, entries, label: 'Item actions' })
  }

  const onRowClick = (item: ListItem, event: MouseEvent) => {
    event.stopPropagation()
    const gesture = event.shiftKey ? 'range' : event.metaKey || event.ctrlKey ? 'toggle' : 'only'
    selection.select(item.path, gesture)
  }

  const onContextMenu = (item: ListItem, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const forItems = selection.selected.has(item.path) ? selectedItems : [item]
    if (!selection.selected.has(item.path)) selection.select(item.path, 'only')
    openMenu({ x: event.clientX, y: event.clientY }, forItems)
  }

  const onMoreActions = (item: ListItem, button: HTMLElement) => {
    const forItems = selection.selected.has(item.path) ? selectedItems : [item]
    if (!selection.selected.has(item.path)) selection.select(item.path, 'only')
    openMenu({ element: button }, forItems)
  }

  const onDragStart = (item: ListItem, event: DragEvent) => {
    const dragged = selection.selected.has(item.path) ? selectedItems : [item]
    if (!selection.selected.has(item.path)) selection.select(item.path, 'only')
    startItemDrag(
      event,
      dragged.map((each) => each.path),
      item.name,
    )
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return
    if (handleKey(event)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  /** Runs the shortcut for `event`. Returns whether it was one. See docs/spec/04-menus-and-shortcuts.md. */
  const handleKey = (event: KeyboardEvent) => {
    const command = event.metaKey || event.ctrlKey
    const single = selectedItems.length === 1 ? selectedItems[0] : undefined
    const inBin = selectedItems.some((item) => item.binEntry)
    // Reading actions work on any item; changing ones need write access to every selected item.
    const readable =
      selectedItems.length > 0 && selectedItems.every((item) => !item.areaRoot) && !inBin
    const modifiable =
      selectedItems.length > 0 &&
      selectedItems.every((item) => !item.areaRoot && canWrite(access, item.path))
    const organisable = modifiable && !inBin
    const rowStep = layout === 'grid' ? gridColumns(listRef.current) : 1

    if (event.key === 'ArrowUp' && event.altKey) {
      onGoUp?.()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      selection.step(event.key === 'ArrowDown' ? rowStep : -rowStep, event.shiftKey)
    } else if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && layout === 'grid') {
      selection.step(event.key === 'ArrowRight' ? 1 : -1, event.shiftKey)
    } else if (event.key === 'Enter' && single) {
      open(single)
    } else if (command && event.code === 'KeyA') {
      selection.selectAll()
    } else if (event.key === 'Escape') {
      selection.clear()
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && modifiable) {
      if (inBin)
        void actions.deleteBinEntries(
          selectedItems.flatMap((item) => (item.binEntry ? [item.binEntry] : [])),
        )
      else void actions.moveToBin(selectedItems)
    } else if (event.key === 'F2' && single && organisable) {
      actions.rename(single)
    } else if (command && event.altKey && event.code === 'KeyM' && organisable) {
      actions.move(selectedItems)
    } else if (command && event.altKey && event.code === 'KeyS' && readable) {
      void actions.toggleStar(selectedItems)
    } else if (
      command &&
      event.altKey &&
      event.code === 'KeyP' &&
      single?.kind === 'file' &&
      !inBin
    ) {
      setPreviewPath(single.path)
    } else if (command && event.altKey && event.code === 'KeyC' && readable) {
      void actions.copyLink(selectedItems)
    } else if (event.shiftKey && event.key === 'F10' && selectedItems.length > 0) {
      openMenu({ element: document.activeElement ?? document.body }, selectedItems)
    } else {
      return false
    }
    return true
  }

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { ...current, ascending: !current.ascending }
        : { ...current, key, ascending: key === 'name' },
    )

  const sortMenu = (element: Element) =>
    setMenu({
      label: 'Sort',
      anchor: { element },
      entries: [
        { type: 'caption', label: 'Sort by' },
        ...(['name', 'modified', 'size'] as SortKey[]).map((key) => ({
          type: 'item' as const,
          label: { name: 'Name', modified: 'Date modified', size: 'File size' }[key],
          icon: sort.key === key ? Check : undefined,
          onSelect: () => setSort({ ...sort, key }),
        })),
        separator,
        { type: 'caption', label: 'Sort direction' },
        {
          type: 'item',
          label: sort.key === 'name' ? 'A to Z' : 'Oldest or smallest first',
          icon: sort.ascending ? Check : undefined,
          onSelect: () => setSort({ ...sort, ascending: true }),
        },
        {
          type: 'item',
          label: sort.key === 'name' ? 'Z to A' : 'Newest or largest first',
          icon: sort.ascending ? undefined : Check,
          onSelect: () => setSort({ ...sort, ascending: false }),
        },
        separator,
        { type: 'caption', label: 'Folders' },
        {
          type: 'item',
          label: 'On top',
          icon: sort.foldersFirst ? Check : undefined,
          onSelect: () => setSort({ ...sort, foldersFirst: true }),
        },
        {
          type: 'item',
          label: 'Mixed with files',
          icon: sort.foldersFirst ? undefined : Check,
          onSelect: () => setSort({ ...sort, foldersFirst: false }),
        },
      ],
    })

  const rowProps = {
    selected: selection.selected,
    focused: selection.focused,
    columns,
    groupBy,
    onClick: onRowClick,
    onOpen: open,
    onContextMenu,
    onMoreActions,
    onDragStart,
  }

  return (
    <div className="browser">
      <section className="browser-card">
        <div className="browser-title-row">
          <div className="browser-title">{title}</div>
          <div className="layout-toggle" role="radiogroup" aria-label="List or grid layout">
            <button
              type="button"
              role="radio"
              aria-checked={layout === 'list'}
              aria-label="List layout"
              onClick={() => setLayout('list')}
            >
              {layout === 'list' && <Check size={16} />} <List size={18} />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={layout === 'grid'}
              aria-label="Grid layout"
              onClick={() => setLayout('grid')}
            >
              {layout === 'grid' && <Check size={16} />} <LayoutGrid size={18} />
            </button>
          </div>
          <button
            type="button"
            className={`icon-button ${detailsOpen ? 'pressed' : ''}`}
            aria-label={detailsOpen ? 'Hide details' : 'View details'}
            aria-pressed={detailsOpen}
            onClick={() => setDetailsOpen(!detailsOpen)}
          >
            <Info size={20} />
          </button>
        </div>

        {selectedItems.length > 0 ? (
          <SelectionBar
            items={selectedItems}
            onClear={selection.clear}
            onMore={(element) => openMenu({ element }, selectedItems)}
          />
        ) : (
          <div className="filter-bar">
            <button
              type="button"
              className={`filter-chip ${typeFilter ? 'active' : ''}`}
              onClick={(event) =>
                setMenu({
                  label: 'Type',
                  anchor: { element: event.currentTarget },
                  entries: TYPE_FILTERS.map(({ type, label }) => ({
                    type: 'item' as const,
                    label,
                    icon: typeFilter === type ? Check : undefined,
                    onSelect: () => setTypeFilter(type),
                  })),
                })
              }
            >
              {typeFilter
                ? TYPE_FILTERS.find((filter) => filter.type === typeFilter)?.label
                : 'Type'}
            </button>
            {typeFilter && (
              <button
                type="button"
                className="icon-button small"
                aria-label="Clear type filter"
                onClick={() => setTypeFilter(undefined)}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {banner}

        <div
          ref={listRef}
          className={`browser-list ${dropActive ? 'drop-active' : ''}`}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          onClick={() => selection.clear()}
          onContextMenu={(event) => {
            if (event.target === event.currentTarget) event.preventDefault()
          }}
          {...dropProps}
        >
          {error ? (
            <div className="browser-state">
              <p>{error}</p>
              {onRetry && (
                <button type="button" className="button button-outlined" onClick={onRetry}>
                  Try again
                </button>
              )}
            </div>
          ) : items === undefined ? (
            <div className="browser-loading" aria-label="Loading">
              <span />
              <span />
              <span />
            </div>
          ) : displayed.length === 0 ? (
            <div className="browser-state">
              {typeFilter ? <p>No items of this type</p> : emptyState}
            </div>
          ) : layout === 'grid' && !groupBy ? (
            <GridLayout items={displayed} {...rowProps} />
          ) : (
            <ListLayout
              items={displayed}
              {...rowProps}
              sort={groupBy ? undefined : sort}
              onSort={groupBy ? undefined : toggleSort}
              sortButton={
                !groupBy && (
                  <button
                    type="button"
                    className="icon-button small"
                    aria-label="Sort options"
                    onClick={(event) => sortMenu(event.currentTarget)}
                  >
                    <ArrowDownUp size={18} />
                  </button>
                )
              }
            />
          )}
          {dropActive && folder && (
            <div className="drop-caption">Drop files to upload them here</div>
          )}
        </div>
      </section>

      {detailsOpen && (
        <DetailsPane
          items={selectedItems}
          onClose={() => setDetailsOpen(false)}
          onManageAccess={(item) => actions.share(item)}
        />
      )}

      {menu && (
        <Menu
          entries={menu.entries}
          anchor={menu.anchor}
          label={menu.label}
          onClose={() => setMenu(undefined)}
        />
      )}

      {previewPath && previewIndex !== -1 && (
        <Preview
          files={previewFiles}
          index={previewIndex}
          loadBytes={loadBytes}
          onNavigate={(index) => setPreviewPath(previewFiles[index].path)}
          onClose={() => {
            selection.select(previewPath, 'only')
            setPreviewPath(undefined)
          }}
          onDownload={(item) => void actions.download([item])}
          onShare={(item) => actions.share(item)}
        />
      )}
    </div>
  )
}

function SelectionBar({
  items,
  onClear,
  onMore,
}: {
  items: ListItem[]
  onClear: () => void
  onMore: (element: Element) => void
}) {
  const actions = useItemActions()
  const { access } = useDrive()
  const binEntries = items.flatMap((item) => (item.binEntry ? [item.binEntry] : []))
  const isBin = binEntries.length > 0
  const isAreas = items.some((item) => item.areaRoot)
  const anyPublic = items.some((item) => item.area === 'public')
  const writable = items.every((item) => canWrite(access, item.path))

  return (
    <div className="selection-bar" role="toolbar" aria-label="Selection actions">
      <button
        type="button"
        className="icon-button small"
        aria-label="Clear selection"
        onClick={onClear}
      >
        <X size={20} />
      </button>
      <span className="selection-count">{items.length} selected</span>
      {isBin ? (
        <>
          <ToolbarButton
            label="Restore"
            icon={RotateCcw}
            onClick={() => void actions.restore(binEntries)}
          />
          <ToolbarButton
            label="Delete forever"
            icon={Trash2}
            onClick={() => void actions.deleteBinEntries(binEntries)}
          />
        </>
      ) : (
        !isAreas && (
          <>
            <ToolbarButton
              label="Share"
              icon={UserPlus}
              disabled={items.length !== 1}
              onClick={() => actions.share(items[0])}
            />
            <ToolbarButton
              label="Download"
              icon={Download}
              onClick={() => void actions.download(items)}
            />
            <ToolbarButton
              label="Move"
              icon={FolderInput}
              disabled={!writable}
              onClick={() => actions.move(items)}
            />
            <ToolbarButton
              label={access.appData ? 'Move to bin' : 'Delete forever'}
              icon={Trash2}
              disabled={!writable}
              onClick={() => void actions.moveToBin(items)}
            />
            <ToolbarButton
              label={items.length > 1 ? 'Copy links' : 'Copy link'}
              icon={Link}
              disabled={!anyPublic}
              onClick={() => void actions.copyLink(items)}
            />
            <button
              type="button"
              className="icon-button small"
              aria-label="More actions"
              onClick={(event) => onMore(event.currentTarget)}
            >
              <EllipsisVertical size={20} />
            </button>
          </>
        )
      )}
    </div>
  )
}

function ToolbarButton(props: {
  label: string
  icon: typeof X
  disabled?: boolean
  onClick: () => void
}) {
  const Icon = props.icon
  return (
    <button
      type="button"
      className="icon-button small"
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <Icon size={20} />
    </button>
  )
}

/** How many tiles fit in a grid row, for ↑ and ↓ in grid layout. */
function gridColumns(container: HTMLElement | null) {
  const tiles = container?.querySelectorAll<HTMLElement>(
    '.file-grid-files > .file-tile, .file-grid-folders > .file-tile',
  )
  if (!tiles || tiles.length < 2) return 1
  const top = tiles[0].offsetTop
  const sameRow = [...tiles].filter((tile) => tile.offsetTop === top).length
  return Math.max(1, sameRow)
}
