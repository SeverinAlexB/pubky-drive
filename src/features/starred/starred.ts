// Starred items, stored as a list of paths in the app's private data.

import { APP_DATA_ROOT } from '../../drive/access'
import { isNotFound } from '../../drive/errors'
import { isWithin, rebasePath, type StoragePath } from '../../drive/paths'
import type { FileStore } from '../../drive/storage'

const STARRED_PATH: StoragePath = `${APP_DATA_ROOT}app/starred.json`

export async function loadStarred(files: FileStore): Promise<Set<StoragePath>> {
  try {
    const value = (await files.getJson(STARRED_PATH)) as { paths?: unknown }
    const paths = Array.isArray(value?.paths) ? value.paths : []
    return new Set(
      paths.filter(
        (path): path is StoragePath => typeof path === 'string' && /^\/(pub|priv)\//.test(path),
      ),
    )
  } catch (error) {
    if (isNotFound(error)) return new Set()
    throw error
  }
}

export async function saveStarred(files: FileStore, starred: ReadonlySet<StoragePath>) {
  await files.putJson(STARRED_PATH, { version: 1, paths: [...starred].sort() })
}

/** Starred paths after the item at `from` moved to `to`. Items inside a moved folder follow it. */
export function followMove(starred: ReadonlySet<StoragePath>, from: StoragePath, to: StoragePath) {
  return new Set(
    [...starred].map((path) => {
      if (path === from) return to
      if (from.endsWith('/') && isWithin(path, from))
        return rebasePath(path, from, to as StoragePath)
      return path
    }),
  )
}

/** Starred paths without the item at `removed` and anything inside it. */
export function forgetRemoved(starred: ReadonlySet<StoragePath>, removed: StoragePath) {
  return new Set(
    [...starred].filter(
      (path) => path !== removed && !(removed.endsWith('/') && isWithin(path, removed)),
    ),
  )
}
