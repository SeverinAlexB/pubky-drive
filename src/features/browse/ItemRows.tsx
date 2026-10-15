// The list and grid layouts of a file list. ItemBrowser owns the state; these only render it.

import { ArrowDown, ArrowUp, EllipsisVertical, Star } from 'lucide-react'
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useDrive } from '../../app/DriveContext'
import { folderLabel, folderRoute } from '../../app/locations'
import { navigate } from '../../app/routes'
import { fileTypeOf, type DriveItem } from '../../drive/items'
import { parentOf, type StoragePath } from '../../drive/paths'
import { FileIcon } from '../../ui/FileIcon'
import { useDropTarget } from './dragAndDrop'
import { formatDate, formatSize } from './format'
import type { ListItem } from './listItem'
import { useFileContent } from '../preview/useFileContent'
import type { SortKey, SortOrder } from './sorting'

/** Which columns follow the name: the owner (folders), the location (Recent, Starred, search) or bin details. */
export type ColumnSet = 'owner' | 'location' | 'bin'

export interface RowHandlers {
  onClick: (item: ListItem, event: MouseEvent) => void
  onOpen: (item: ListItem) => void
  onContextMenu: (item: ListItem, event: MouseEvent) => void
  onMoreActions: (item: ListItem, button: HTMLElement) => void
  onDragStart: (item: ListItem, event: DragEvent) => void
}

interface RowsProps extends RowHandlers {
  items: ListItem[]
  selected: ReadonlySet<StoragePath>
  focused?: StoragePath
  columns: ColumnSet
  groupBy?: (item: ListItem) => string
}

interface ListProps extends RowsProps {
  sort?: SortOrder
  onSort?: (key: SortKey) => void
  sortButton?: ReactNode
}

export function ListLayout(props: ListProps) {
  const { items, columns, groupBy, sort, onSort, sortButton } = props
  const groups = groupItems(items, groupBy)

  return (
    <div
      className={`file-list columns-${columns}`}
      role="grid"
      aria-label="Items"
      aria-multiselectable="true"
    >
      <div className="file-list-header" role="row">
        <HeaderCell label="Name" sortKey="name" sort={sort} onSort={onSort} />
        {columns === 'owner' && <span role="columnheader">Owner</span>}
        {columns !== 'owner' && (
          <span role="columnheader">{columns === 'bin' ? 'Original location' : 'Location'}</span>
        )}
        {columns === 'bin' ? (
          <span role="columnheader">Date binned</span>
        ) : (
          <HeaderCell label="Date modified" sortKey="modified" sort={sort} onSort={onSort} />
        )}
        <HeaderCell label="File size" sortKey="size" sort={sort} onSort={onSort} />
        <span className="file-list-sort">{sortButton}</span>
      </div>
      {groups.map(({ heading, items: groupItems }) => (
        <Fragment key={heading ?? 'all'}>
          {heading && (
            <div className="file-list-group" role="row">
              <span role="rowheader">{heading}</span>
            </div>
          )}
          {groupItems.map((item) => (
            <ListRow key={item.path} item={item} {...props} />
          ))}
        </Fragment>
      ))}
    </div>
  )
}

function HeaderCell(props: {
  label: string
  sortKey: SortKey
  sort?: SortOrder
  onSort?: (key: SortKey) => void
}) {
  const { label, sortKey, sort, onSort } = props
  if (!onSort) return <span role="columnheader">{label}</span>

  const active = sort?.key === sortKey
  const Arrow = sort?.ascending ? ArrowUp : ArrowDown
  return (
    <span
      role="columnheader"
      aria-sort={active ? (sort?.ascending ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`file-list-sort-header ${active ? 'active' : ''}`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        {active && (
          <span className="file-list-sort-arrow">
            <Arrow size={16} />
          </span>
        )}
      </button>
    </span>
  )
}

function ListRow({
  item,
  selected,
  focused,
  columns,
  ...handlers
}: RowsProps & { item: ListItem }) {
  const { access, starred } = useDrive()
  const isSelected = selected.has(item.path)
  const { active: dropActive, dropProps } = useDropTarget(acceptsDrop(item) ? item.path : undefined)
  const binned = item.binEntry

  return (
    <div
      className={`file-row ${isSelected ? 'selected' : ''} ${dropActive ? 'drop-active' : ''}`}
      role="row"
      aria-selected={isSelected}
      data-path={item.path}
      tabIndex={focused === item.path ? 0 : -1}
      draggable={!item.areaRoot && !binned}
      onClick={(event) => handlers.onClick(item, event)}
      onDoubleClick={() => handlers.onOpen(item)}
      onContextMenu={(event) => handlers.onContextMenu(item, event)}
      onDragStart={(event) => handlers.onDragStart(item, event)}
      {...dropProps}
    >
      <span role="gridcell" className="file-name">
        <FileIcon item={item} areaRoot={item.areaRoot} />
        <span className="file-name-text">{item.name}</span>
        {starred.has(item.path) && (
          <Star size={14} className="file-star" fill="currentColor" aria-label="Starred" />
        )}
      </span>
      {columns === 'owner' && <span role="gridcell">{item.areaRoot ? '' : 'me'}</span>}
      {columns !== 'owner' && (
        <span role="gridcell" className="file-location">
          {binned ? (
            folderLabel(parentOf(binned.originalPath), access)
          ) : item.location ? (
            <button
              type="button"
              className="file-location-link"
              onClick={(event) => {
                event.stopPropagation()
                navigate(folderRoute(item.location!, access))
              }}
            >
              {folderLabel(item.location, access)}
            </button>
          ) : null}
        </span>
      )}
      <span role="gridcell">
        {binned
          ? formatDate(binned.binnedAtMs)
          : item.kind === 'folder'
            ? '—'
            : formatDate(item.modifiedMs)}
      </span>
      <span role="gridcell">{item.kind === 'folder' ? '—' : formatSize(item.sizeBytes)}</span>
      <span role="gridcell" className="file-actions">
        {!item.areaRoot && (
          <button
            type="button"
            className="icon-button small"
            aria-label={`More actions for ${item.name}`}
            onClick={(event) => {
              event.stopPropagation()
              handlers.onMoreActions(item, event.currentTarget)
            }}
          >
            <EllipsisVertical size={18} />
          </button>
        )}
      </span>
    </div>
  )
}

export function GridLayout(props: RowsProps) {
  const folders = props.items.filter((item) => item.kind === 'folder')
  const files = props.items.filter((item) => item.kind === 'file')

  return (
    <div className="file-grid" role="grid" aria-label="Items" aria-multiselectable="true">
      {folders.length > 0 && (
        <>
          <h3 className="file-grid-heading">Folders</h3>
          <div className="file-grid-folders" role="row">
            {folders.map((item) => (
              <GridTile key={item.path} item={item} {...props} />
            ))}
          </div>
        </>
      )}
      {files.length > 0 && (
        <>
          <h3 className="file-grid-heading">Files</h3>
          <div className="file-grid-files" role="row">
            {files.map((item) => (
              <GridTile key={item.path} item={item} {...props} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function GridTile(props: RowsProps & { item: ListItem }) {
  const { item, selected, focused, ...handlers } = props
  const { starred } = useDrive()
  const isSelected = selected.has(item.path)
  const { active: dropActive, dropProps } = useDropTarget(acceptsDrop(item) ? item.path : undefined)

  return (
    <div
      className={`file-tile ${item.kind} ${isSelected ? 'selected' : ''} ${dropActive ? 'drop-active' : ''}`}
      role="gridcell"
      aria-selected={isSelected}
      data-path={item.path}
      tabIndex={focused === item.path ? 0 : -1}
      draggable={!item.areaRoot && !item.binEntry}
      onClick={(event) => handlers.onClick(item, event)}
      onDoubleClick={() => handlers.onOpen(item)}
      onContextMenu={(event) => handlers.onContextMenu(item, event)}
      onDragStart={(event) => handlers.onDragStart(item, event)}
      {...dropProps}
    >
      <div className="file-tile-header">
        <FileIcon item={item} areaRoot={item.areaRoot} />
        <span className="file-name-text" title={item.name}>
          {item.name}
        </span>
        {starred.has(item.path) && (
          <Star size={14} className="file-star" fill="currentColor" aria-label="Starred" />
        )}
        {!item.areaRoot && (
          <button
            type="button"
            className="icon-button small"
            aria-label={`More actions for ${item.name}`}
            onClick={(event) => {
              event.stopPropagation()
              handlers.onMoreActions(item, event.currentTarget)
            }}
          >
            <EllipsisVertical size={18} />
          </button>
        )}
      </div>
      {item.kind === 'file' && <Thumbnail item={item} />}
    </div>
  )
}

const THUMBNAIL_MAX_BYTES = 10 * 1024 * 1024

/** An image thumbnail, loaded once the card scrolls into view; other files show a large icon. */
function Thumbnail({ item }: { item: DriveItem }) {
  const { drive } = useDrive()
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const isImage = fileTypeOf(item) === 'image' && (item.sizeBytes ?? 0) <= THUMBNAIL_MAX_BYTES
  const loadBytes = useCallback((file: DriveItem) => drive.files.getBytes(file.path), [drive])
  const content = useFileContent(item, loadBytes, isImage && visible)

  useEffect(() => {
    const element = ref.current
    if (!element || !isImage) return
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true))
    observer.observe(element)
    return () => observer.disconnect()
  }, [isImage])

  return (
    <div ref={ref} className="file-tile-preview">
      {content.state === 'url' && isImage ? (
        <img src={content.url} alt="" />
      ) : (
        <FileIcon item={item} size={64} />
      )}
    </div>
  )
}

function acceptsDrop(item: ListItem) {
  return item.kind === 'folder' && !item.binEntry
}

function groupItems(items: ListItem[], groupBy?: (item: ListItem) => string) {
  if (!groupBy) return [{ heading: undefined, items }]
  const groups = new Map<string, ListItem[]>()
  for (const item of items) {
    const heading = groupBy(item)
    groups.set(heading, [...(groups.get(heading) ?? []), item])
  }
  return [...groups].map(([heading, grouped]) => ({ heading, items: grouped }))
}
