// Folder creation, copy, move, rename and delete, built from reads, writes and deletes because
// the homeserver has no server-side copy or move. See docs/design.md, "Operations without server
// support".

import { NameTakenError, PartialOperationError } from './errors'
import type { DriveItem } from './items'
import { FOLDER_MARKER, nameProblem, uniqueName } from './names'
import { childPath, isWithin, nameOf, parentOf, rebasePath, type StoragePath } from './paths'
import type { DriveStorage } from './storage'

/** Reports how many of the operation's files are done. */
export type Progress = (done: number, total: number) => void

/** What to do when the target name already exists. */
export type NameConflict = 'fail' | 'number'

/** Creates an empty folder and returns its path. */
export async function createFolder(drive: DriveStorage, parent: StoragePath, name: string) {
  const folderName = await freeName(drive, parent, name, 'folder', 'fail')
  const folder = childPath(parent, folderName, 'folder')
  await drive.files.putBytes(markerOf(folder), new Uint8Array())
  return folder
}

/** Copies `item` into `targetFolder` as `name` and returns the new path. */
export async function copyItem(
  drive: DriveStorage,
  item: DriveItem,
  targetFolder: StoragePath,
  name: string,
  onProgress?: Progress,
) {
  const target = childPath(
    targetFolder,
    await freeName(drive, targetFolder, name, item.kind, 'number'),
    item.kind,
  )
  const sources = await filesOf(drive, item)

  await forEachFile('Copied', sources, onProgress, async (source) => {
    await copyFile(drive, source, targetPathOf(item, target, source))
  })
  return target
}

/**
 * Moves `item` into `targetFolder` as `name` and returns the new path. Each file is written to
 * its new place before the original is deleted, so a failure never loses data. The folder the
 * item leaves keeps existing even when it becomes empty.
 */
export async function moveItem(
  drive: DriveStorage,
  item: DriveItem,
  targetFolder: StoragePath,
  name: string,
  conflict: NameConflict,
  onProgress?: Progress,
) {
  if (item.kind === 'folder' && isWithin(targetFolder, item.path)) {
    throw new Error('A folder can’t be moved into itself.')
  }
  if (childPath(targetFolder, name, item.kind) === item.path) return item.path

  const target = childPath(
    targetFolder,
    await freeName(drive, targetFolder, name, item.kind, conflict),
    item.kind,
  )
  const sources = await filesOf(drive, item)

  await forEachFile('Moved', sources, onProgress, async (source) => {
    await copyFile(drive, source, targetPathOf(item, target, source))
    await drive.files.delete(source)
  })
  await keepFolder(drive, parentOf(item.path))
  return target
}

export function renameItem(
  drive: DriveStorage,
  item: DriveItem,
  newName: string,
  onProgress?: Progress,
) {
  return moveItem(drive, item, parentOf(item.path), newName, 'fail', onProgress)
}

/** Deletes `item` and everything inside it. The folder that contained it keeps existing. */
export async function deleteItem(drive: DriveStorage, item: DriveItem, onProgress?: Progress) {
  const sources = await filesOf(drive, item)
  await forEachFile('Deleted', sources, onProgress, (source) => drive.files.delete(source))
  await keepFolder(drive, parentOf(item.path))
}

/**
 * Returns `name` when it's free in `folder`. Otherwise returns a numbered variant, or throws
 * `NameTakenError` when `conflict` is `fail`.
 */
export async function freeName(
  drive: DriveStorage,
  folder: StoragePath,
  name: string,
  kind: 'file' | 'folder',
  conflict: NameConflict,
) {
  const problem = nameProblem(name)
  if (problem) throw new Error(problem)

  const taken = await drive.childNames(folder)
  if (!taken.has(name)) return name
  if (conflict === 'fail') throw new NameTakenError(name)
  return uniqueName(name, taken, kind)
}

/** Writes a folder marker into `folder` when it has nothing else left, so it stays visible. */
export async function keepFolder(drive: DriveStorage, folder: StoragePath) {
  const names = await drive.childNames(folder)
  if (names.size === 0) await drive.files.putBytes(markerOf(folder), new Uint8Array())
}

function markerOf(folder: StoragePath) {
  return `${folder}${FOLDER_MARKER}` as StoragePath
}

async function filesOf(drive: DriveStorage, item: DriveItem) {
  if (item.kind === 'file') return [item.path]
  return drive.listFilesBelow(item.path)
}

function targetPathOf(item: DriveItem, target: StoragePath, source: StoragePath) {
  return item.kind === 'file' ? target : rebasePath(source, item.path, target)
}

async function copyFile(drive: DriveStorage, source: StoragePath, target: StoragePath) {
  const bytes = await drive.files.getBytes(source)
  await drive.files.putBytes(target, bytes)
}

async function forEachFile(
  verb: string,
  sources: readonly StoragePath[],
  onProgress: Progress | undefined,
  step: (source: StoragePath) => Promise<void>,
) {
  onProgress?.(0, sources.length)
  for (const [index, source] of sources.entries()) {
    try {
      await step(source)
    } catch (error) {
      if (sources.length === 1) throw error
      throw new PartialOperationError(verb, index, sources.length, nameOf(source), error)
    }
    onProgress?.(index + 1, sources.length)
  }
}
