// The bin: binned items live in the app's private folder until restored or deleted.
// See docs/design.md, "Bin".

import { BIN_RETENTION_DAYS } from '../../config'
import { APP_DATA_ROOT } from '../../drive/access'
import { isNotFound } from '../../drive/errors'
import { itemFromPath, type DriveItem } from '../../drive/items'
import { moveItem, type Progress } from '../../drive/operations'
import {
  childPath,
  isFolderPath,
  isWithin,
  nameOf,
  parentOf,
  type StoragePath,
} from '../../drive/paths'
import type { DriveStorage } from '../../drive/storage'
import { mapWithConcurrency } from '../../drive/concurrency'

export const BIN_ROOT: StoragePath = `${APP_DATA_ROOT}bin/`
const DAY_MS = 24 * 60 * 60 * 1000

/** One binned file or folder. */
export interface BinEntry {
  id: string
  name: string
  kind: 'file' | 'folder'
  /** Where the item was before it was binned. */
  originalPath: StoragePath
  /** Where the item's content is stored while it's in the bin. */
  contentPath: StoragePath
  binnedAtMs: number
  sizeBytes?: number
}

/** The record stored as `entry.json` next to the binned content. */
interface EntryRecord {
  version: 1
  originalPath: StoragePath
  binnedAtMs: number
  sizeBytes?: number
}

/** Moves `item` into a new bin entry. The entry record is written first, so content always has one. */
export async function moveToBin(drive: DriveStorage, item: DriveItem, onProgress?: Progress) {
  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
  const record: EntryRecord = {
    version: 1,
    originalPath: item.path,
    binnedAtMs: Date.now(),
    sizeBytes: item.sizeBytes,
  }

  await drive.files.putJson(recordPath(id), record)
  await moveItem(drive, item, contentFolder(id), item.name, 'fail', onProgress)
  return toEntry(id, record)
}

/** All bin entries, most recently binned first. Entries with unreadable records are skipped. */
export async function listBin(drive: DriveStorage): Promise<BinEntry[]> {
  const ids = [...(await drive.childNames(BIN_ROOT))]
  const entries = await mapWithConcurrency(ids, 8, async (id) => {
    try {
      const record = parseRecord(await drive.files.getJson(recordPath(id)))
      return record ? toEntry(id, record) : undefined
    } catch (error) {
      if (isNotFound(error)) return undefined
      throw error
    }
  })

  return entries
    .filter((entry): entry is BinEntry => entry !== undefined)
    .sort((a, b) => b.binnedAtMs - a.binnedAtMs)
}

/**
 * Moves the entry's content back to its original folder, numbering the name if it's taken.
 * `allowedRoots` are the area roots of the session: the entry record decides where content goes,
 * so a record that points elsewhere (for example, one edited by another app) is refused.
 */
export async function restoreFromBin(
  drive: DriveStorage,
  entry: BinEntry,
  allowedRoots: readonly StoragePath[],
  onProgress?: Progress,
) {
  if (!allowedRoots.some((root) => isWithin(entry.originalPath, root))) {
    throw new Error(
      `‘${entry.name}’ can’t be restored to ${entry.originalPath}, which this session can’t access.`,
    )
  }
  const content = itemFromPath(entry.contentPath)
  const restored = await moveItem(
    drive,
    content,
    parentOf(entry.originalPath),
    entry.name,
    'number',
    onProgress,
  )
  await removeEntry(drive, entry.id)
  return restored
}

export async function deleteForever(drive: DriveStorage, entry: BinEntry) {
  await removeEntry(drive, entry.id)
}

export async function emptyBin(drive: DriveStorage, entries: readonly BinEntry[]) {
  for (const entry of entries) await removeEntry(drive, entry.id)
}

/** Deletes entries binned more than the retention period ago. Returns how many were deleted. */
export async function deleteExpiredEntries(drive: DriveStorage, nowMs = Date.now()) {
  const cutoff = nowMs - BIN_RETENTION_DAYS * DAY_MS
  const expired = (await listBin(drive)).filter((entry) => entry.binnedAtMs < cutoff)
  await emptyBin(drive, expired)
  return expired.length
}

async function removeEntry(drive: DriveStorage, id: string) {
  const files = await drive.listFilesBelow(entryFolder(id))
  for (const file of files) await drive.files.delete(file)
}

function toEntry(id: string, record: EntryRecord): BinEntry {
  const kind = isFolderPath(record.originalPath) ? 'folder' : 'file'
  const name = nameOf(record.originalPath)
  return {
    id,
    name,
    kind,
    originalPath: record.originalPath,
    contentPath: childPath(contentFolder(id), name, kind),
    binnedAtMs: record.binnedAtMs,
    sizeBytes: record.sizeBytes,
  }
}

function parseRecord(value: unknown): EntryRecord | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const { originalPath, binnedAtMs, sizeBytes } = value as Record<string, unknown>
  if (typeof originalPath !== 'string' || !/^\/(pub|priv)\/./.test(originalPath)) return undefined
  if (typeof binnedAtMs !== 'number') return undefined
  return {
    version: 1,
    originalPath: originalPath as StoragePath,
    binnedAtMs,
    sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : undefined,
  }
}

function entryFolder(id: string): StoragePath {
  return `${BIN_ROOT}${id}/`
}

function contentFolder(id: string): StoragePath {
  return `${entryFolder(id)}content/`
}

function recordPath(id: string): StoragePath {
  return `${entryFolder(id)}entry.json`
}
