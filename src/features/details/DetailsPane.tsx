import { Copy, Globe, Lock, X } from 'lucide-react'
import { useCallback } from 'react'
import { useDrive } from '../../app/DriveContext'
import { folderLabel, folderRoute } from '../../app/locations'
import { navigate } from '../../app/routes'
import { FILE_TYPE_LABELS, fileTypeOf, type DriveItem } from '../../drive/items'
import { parentOf } from '../../drive/paths'
import { FileIcon } from '../../ui/FileIcon'
import { useNotifier } from '../../ui/Snackbar'
import { formatDateTime, formatSize, shortKey } from '../browse/format'
import type { ListItem } from '../browse/listItem'
import { useFileContent } from '../preview/useFileContent'
import { copyText } from '../sharing/clipboard'
import './DetailsPane.css'

interface DetailsPaneProps {
  items: ListItem[]
  onClose: () => void
  onManageAccess: (item: DriveItem) => void
}

/** Details of the selected item. See docs/spec/08-preview-and-details.md. */
export function DetailsPane({ items, onClose, onManageAccess }: DetailsPaneProps) {
  const item = items.length === 1 ? items[0] : undefined

  return (
    <aside className="details-pane" aria-label="Details">
      <header className="details-header">
        {item && <FileIcon item={item} areaRoot={item.areaRoot} />}
        <h2>
          {item ? item.name : items.length > 1 ? `${items.length} items selected` : 'Details'}
        </h2>
        <button type="button" className="icon-button" aria-label="Hide details" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {item ? (
        <ItemDetails item={item} onManageAccess={onManageAccess} />
      ) : (
        <p className="details-empty">
          {items.length > 1 ? '' : 'Select an item to see the details'}
        </p>
      )}
    </aside>
  )
}

function ItemDetails({
  item,
  onManageAccess,
}: {
  item: ListItem
  onManageAccess: (item: DriveItem) => void
}) {
  const { drive, ownerZ32 } = useDrive()
  const { notify } = useNotifier()
  const loadBytes = useCallback((file: DriveItem) => drive.files.getBytes(file.path), [drive])
  const isImage = fileTypeOf(item) === 'image' && (item.sizeBytes ?? 0) < 20 * 1024 * 1024
  const thumbnail = useFileContent(item, loadBytes, isImage && !item.binEntry)
  const isPublic = item.area === 'public'
  const modifiable = !item.areaRoot && !item.binEntry

  return (
    <div className="details-body">
      <div className="details-thumbnail">
        {thumbnail.state === 'url' && isImage ? (
          <img src={thumbnail.url} alt="" />
        ) : (
          <FileIcon item={item} areaRoot={item.areaRoot} size={64} />
        )}
      </div>

      <section>
        <h3>Who has access</h3>
        <p className="details-access">
          {isPublic ? <Globe size={20} /> : <Lock size={20} />}
          {isPublic
            ? 'Public: anyone with the address'
            : 'Private: only you and apps you authorize'}
        </p>
        {modifiable && (
          <button
            type="button"
            className="button button-outlined"
            onClick={() => onManageAccess(item)}
          >
            Manage access
          </button>
        )}
      </section>

      <section>
        <h3>{item.kind === 'folder' ? 'Folder details' : 'File details'}</h3>
        <dl className="details-list">
          <dt>Type</dt>
          <dd>{FILE_TYPE_LABELS[fileTypeOf(item)]}</dd>
          {item.kind === 'file' && (
            <>
              <dt>Size</dt>
              <dd>{formatSize(item.sizeBytes)}</dd>
            </>
          )}
          {!item.areaRoot && (
            <>
              <dt>Location</dt>
              <dd>
                {item.binEntry ? (
                  folderLabel(parentOf(item.binEntry.originalPath))
                ) : (
                  <button
                    type="button"
                    className="details-link"
                    onClick={() => navigate(folderRoute(parentOf(item.path)))}
                  >
                    {folderLabel(parentOf(item.path))}
                  </button>
                )}
              </dd>
            </>
          )}
          <dt>Owner</dt>
          <dd>{shortKey(ownerZ32)} (me)</dd>
          {item.kind === 'file' && (
            <>
              <dt>Modified</dt>
              <dd>{formatDateTime(item.modifiedMs)}</dd>
            </>
          )}
          {item.binEntry && (
            <>
              <dt>Binned</dt>
              <dd>{formatDateTime(item.binEntry.binnedAtMs)}</dd>
            </>
          )}
          <dt>Path</dt>
          <dd className="details-path">
            <code>{item.binEntry?.originalPath ?? item.path}</code>
            <button
              type="button"
              className="icon-button small"
              aria-label="Copy path"
              onClick={() =>
                copyText(item.binEntry?.originalPath ?? item.path).then(() => notify('Path copied'))
              }
            >
              <Copy size={16} />
            </button>
          </dd>
        </dl>
      </section>
    </div>
  )
}
