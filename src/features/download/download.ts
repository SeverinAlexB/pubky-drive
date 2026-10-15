// Downloads: one file as itself, folders and several items as a ZIP file.

import { zip, type Zippable } from 'fflate'
import type { DriveItem } from '../../drive/items'
import { FOLDER_MARKER } from '../../drive/names'
import { nameOf, parentOf } from '../../drive/paths'
import type { DriveStorage } from '../../drive/storage'

export async function downloadItems(drive: DriveStorage, items: readonly DriveItem[]) {
  if (items.length === 1 && items[0].kind === 'file') {
    const [item] = items
    const bytes = await drive.files.getBytes(item.path)
    saveBlob(new Blob([bytes as BlobPart], { type: item.contentType }), item.name)
    return
  }

  const zipName =
    items.length === 1
      ? `${items[0].name}.zip`
      : `pubky-drive-${new Date().toISOString().slice(0, 10)}.zip`
  saveBlob(
    new Blob([(await zipItems(drive, items)) as BlobPart], { type: 'application/zip' }),
    zipName,
  )
}

/** A ZIP archive of the items, with folders keeping their structure. */
export async function zipItems(drive: DriveStorage, items: readonly DriveItem[]) {
  const entries: Zippable = {}

  for (const item of items) {
    const base = parentOf(item.path)
    const files = item.kind === 'file' ? [item.path] : await drive.listFilesBelow(item.path)
    for (const file of files) {
      if (nameOf(file) === FOLDER_MARKER) continue
      entries[file.slice(base.length)] = await drive.files.getBytes(file)
    }
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    zip(entries, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data)))
  })
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
