import { useEffect, useState } from 'react'
import { describeError } from '../../drive/errors'
import { fileTypeOf, type DriveItem, type FileType } from '../../drive/items'

/** Reads a file's bytes: from session storage when signed in, or public storage in the viewer. */
export type LoadBytes = (item: DriveItem) => Promise<Uint8Array>

const TEXT_PREVIEW_BYTES = 1024 * 1024

export type FileContent =
  | { state: 'loading' }
  | { state: 'failed'; error: string }
  | { state: 'url'; url: string; type: FileType }
  | { state: 'text'; text: string; truncated: boolean }
  | { state: 'unsupported' }

const PREVIEWABLE: ReadonlySet<FileType> = new Set(['image', 'pdf', 'text', 'audio', 'video'])

/**
 * Loads `item` for display. Media get an object URL that is revoked on change. Text is decoded,
 * up to 1 MB. Other types aren't loaded.
 */
export function useFileContent(
  item: DriveItem | undefined,
  loadBytes: LoadBytes,
  enabled = true,
): FileContent {
  const type = item ? fileTypeOf(item) : undefined
  const loadable = Boolean(item && type && enabled && PREVIEWABLE.has(type))
  // Content belongs to the item it was loaded for; another item shows "loading" until its own arrives.
  const [loaded, setLoaded] = useState<{ item: DriveItem; content: FileContent }>()

  useEffect(() => {
    if (!item || !type || !loadable) return
    let active = true
    let url: string | undefined
    const show = (content: FileContent) => active && setLoaded({ item, content })

    loadBytes(item).then(
      (bytes) => {
        if (type === 'text') {
          const truncated = bytes.length > TEXT_PREVIEW_BYTES
          const text = new TextDecoder().decode(
            truncated ? bytes.slice(0, TEXT_PREVIEW_BYTES) : bytes,
          )
          show({ state: 'text', text, truncated })
          return
        }
        if (!active) return
        url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: blobType(item, type) }))
        show({ state: 'url', url, type })
      },
      (error: unknown) => show({ state: 'failed', error: describeError(error) }),
    )

    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [item, type, loadable, loadBytes])

  if (item && type && enabled && !PREVIEWABLE.has(type)) return { state: 'unsupported' }
  return loaded && loaded.item === item ? loaded.content : { state: 'loading' }
}

/**
 * The media type for the object URL. PDFs always get `application/pdf`, so the browser opens its
 * PDF viewer and never renders the bytes as a page of this app.
 */
function blobType(item: DriveItem, type: FileType) {
  if (type === 'pdf') return 'application/pdf'
  if (type === 'image' && item.name.toLowerCase().endsWith('.svg')) return 'image/svg+xml'
  return item.contentType?.split(';')[0] ?? ''
}
