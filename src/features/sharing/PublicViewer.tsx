import { HardDrive, LoaderCircle } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { navigate, routeHash } from '../../app/routes'
import { useLoad } from '../../app/useLoad'
import { mapWithConcurrency } from '../../drive/concurrency'
import { isNotFound } from '../../drive/errors'
import { itemFromPath, type DriveItem } from '../../drive/items'
import { FOLDER_MARKER } from '../../drive/names'
import {
  isFolderPath,
  nameOf,
  parentOf,
  pathFromListedUrl,
  type StoragePath,
} from '../../drive/paths'
import { pubky } from '../../pubky/client'
import { FileIcon } from '../../ui/FileIcon'
import { formatDate, formatSize } from '../browse/format'
import { saveBlob } from '../download/download'
import { Preview } from '../preview/Preview'
import { parseViewerAddress, pubkyAddress } from './links'
import './PublicViewer.css'

type Loaded =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'failed'; error: string }
  | { state: 'file'; item: DriveItem }
  | { state: 'folder'; items: DriveItem[] }

/** Public files and folders, without signing in. See docs/spec/09-sharing.md, "Public viewer". */
export function PublicViewer({ address }: { address: string }) {
  const target = useMemo(() => parseViewerAddress(address), [address])
  const load = useCallback(
    (): Promise<Loaded> =>
      target ? loadPublic(target.ownerZ32, target.path) : Promise.resolve({ state: 'missing' }),
    [target],
  )
  const { data, error } = useLoad(load)
  const loaded: Loaded = error ? { state: 'failed', error } : (data ?? { state: 'loading' })

  const loadBytes = useCallback(
    (item: DriveItem) =>
      target
        ? pubky.publicStorage.getBytes(pubkyAddress(target.ownerZ32, item.path))
        : Promise.reject(),
    [target],
  )

  const openPath = (path: StoragePath) =>
    target && navigate({ view: 'viewer', address: pubkyAddress(target.ownerZ32, path) })

  return (
    <div className="viewer">
      <header className="viewer-header">
        <a className="shell-logo" href={routeHash({ view: 'my-drive' })}>
          <HardDrive size={28} color="#0b57d0" aria-hidden />
          <span>Pubky Drive</span>
        </a>
        <a className="button button-filled" href={routeHash({ view: 'my-drive' })}>
          Sign in
        </a>
      </header>

      <main className="viewer-card">
        {!target || loaded.state === 'missing' ? (
          <p className="viewer-message">
            This file isn’t available. It may have been moved, deleted or made private.
          </p>
        ) : loaded.state === 'loading' ? (
          <p className="viewer-message">
            <LoaderCircle className="spinner" /> Loading…
          </p>
        ) : loaded.state === 'failed' ? (
          <p className="viewer-message">{loaded.error}</p>
        ) : loaded.state === 'folder' ? (
          <PublicFolder
            path={target.path}
            items={loaded.items}
            onOpen={(item) => openPath(item.path)}
          />
        ) : (
          <Preview
            files={[loaded.item]}
            index={0}
            loadBytes={loadBytes}
            onNavigate={() => {}}
            onClose={() => openPath(parentOf(target.path))}
            onDownload={(item) =>
              void loadBytes(item).then((bytes) =>
                saveBlob(new Blob([bytes as BlobPart], { type: item.contentType }), item.name),
              )
            }
          />
        )}
      </main>
    </div>
  )
}

function PublicFolder({
  path,
  items,
  onOpen,
}: {
  path: StoragePath
  items: DriveItem[]
  onOpen: (item: DriveItem) => void
}) {
  return (
    <>
      <h1 className="viewer-title">{nameOf(path) || 'pub'}</h1>
      {items.length === 0 ? (
        <p className="viewer-message">This folder is empty.</p>
      ) : (
        <ul className="viewer-list">
          {items.map((item) => (
            <li key={item.path}>
              <button type="button" onClick={() => onOpen(item)}>
                <FileIcon item={item} />
                <span className="viewer-name">{item.name}</span>
                <span className="muted">
                  {item.kind === 'folder' ? '—' : formatDate(item.modifiedMs)}
                </span>
                <span className="muted">
                  {item.kind === 'folder' ? '—' : formatSize(item.sizeBytes)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

async function loadPublic(ownerZ32: string, path: StoragePath): Promise<Loaded> {
  const storage = pubky.publicStorage
  const address = (item: StoragePath) => pubkyAddress(ownerZ32, item)

  if (!isFolderPath(path)) {
    const stats = await storage.stats(address(path))
    if (!stats) return { state: 'missing' }
    return {
      state: 'file',
      item: {
        ...itemFromPath(path),
        sizeBytes: stats.contentLength,
        contentType: stats.contentType,
        modifiedMs: stats.lastModifiedMs,
      },
    }
  }

  let urls: string[]
  try {
    urls = await storage.list(address(path), null, false, 500, true)
  } catch (error) {
    if (isNotFound(error)) return { state: 'missing' }
    throw error
  }
  const paths = urls
    .map((url) => pathFromListedUrl(url, ownerZ32))
    .filter((child) => nameOf(child) !== FOLDER_MARKER)
  const items = await mapWithConcurrency(paths, 8, async (child) => {
    const item = itemFromPath(child)
    if (item.kind === 'folder') return item
    const stats = await storage.stats(address(child))
    return {
      ...item,
      sizeBytes: stats?.contentLength,
      contentType: stats?.contentType,
      modifiedMs: stats?.lastModifiedMs,
    }
  })
  items.sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1,
  )
  return { state: 'folder', items }
}
