// Where uploaded files go. See docs/spec/05-upload-and-download.md.

import { nameProblem, uniqueName } from '../../drive/names'
import type { StoragePath } from '../../drive/paths'
import type { DriveStorage } from '../../drive/storage'

/** A file chosen for upload, with its path relative to the chosen folder (`a/b.txt` for folder uploads). */
export interface ChosenFile {
  file: File
  relativePath: string
}

export interface PlannedUpload {
  file: File
  target: StoragePath
}

/**
 * Maps chosen files to target paths in `folder`. A top-level file or folder whose name is taken
 * gets a numbered name, so uploads never replace existing files. `pending` are the targets of
 * uploads that haven't finished yet: their names count as taken, although the homeserver doesn't
 * list them yet.
 */
export async function planUploads(
  drive: DriveStorage,
  folder: StoragePath,
  chosen: readonly ChosenFile[],
  pending: Iterable<StoragePath> = [],
): Promise<PlannedUpload[]> {
  const taken = await drive.childNames(folder)
  for (const target of pending) {
    if (target.startsWith(folder)) taken.add(target.slice(folder.length).split('/')[0])
  }
  const renamedTopLevel = new Map<string, string>()

  return chosen.map(({ file, relativePath }) => {
    const segments = relativePath.split('/').filter(Boolean)
    const problem = segments.map(nameProblem).find(Boolean)
    if (problem) throw new Error(`Can’t upload ‘${relativePath}’: ${problem}`)

    const [topLevel, ...rest] = segments
    let renamed = renamedTopLevel.get(topLevel)
    if (!renamed) {
      renamed = uniqueName(topLevel, taken, rest.length > 0 ? 'folder' : 'file')
      taken.add(renamed)
      renamedTopLevel.set(topLevel, renamed)
    }

    return { file, target: `${folder}${[renamed, ...rest].join('/')}` as StoragePath }
  })
}
