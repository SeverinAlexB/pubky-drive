import type { ResourceStats } from '@synonymdev/pubky'
import { mapWithConcurrency } from './concurrency'
import { isNotFound } from './errors'
import { itemFromPath, type DriveItem } from './items'
import { FOLDER_MARKER } from './names'
import { isFolderPath, nameOf, pathFromListedUrl, type StoragePath } from './paths'

/** The part of the SDK's `SessionStorage` that Pubky Drive uses. */
export interface FileStore {
  list(
    path: StoragePath,
    cursor: string | null,
    reverse: boolean,
    limit: number,
    shallow: boolean,
  ): Promise<string[]>
  stats(path: StoragePath): Promise<ResourceStats | undefined>
  getBytes(path: StoragePath): Promise<Uint8Array>
  putBytes(path: StoragePath, body: Uint8Array): Promise<void>
  getJson(path: StoragePath): Promise<unknown>
  putJson(path: StoragePath, body: unknown): Promise<void>
  delete(path: StoragePath): Promise<void>
}

const LIST_PAGE_SIZE = 100
const STATS_CONCURRENCY = 8

/**
 * The signed-in user's files, seen as folders and items. Listings hide folder markers and the
 * app's own data folders.
 */
export interface ListOptions {
  /**
   * List everything stored, including folder markers and the app's hidden folders, as the
   * Homeserver section does.
   */
  everything?: boolean
}

export class DriveStorage {
  readonly files: FileStore
  private readonly ownerZ32: string
  private readonly hiddenFolders: readonly StoragePath[]

  constructor(files: FileStore, ownerZ32: string, hiddenFolders: readonly StoragePath[] = []) {
    this.files = files
    this.ownerZ32 = ownerZ32
    this.hiddenFolders = hiddenFolders
  }

  /** The folders and files directly inside `folder`, with file metadata. Missing folders are empty. */
  async listFolder(folder: StoragePath, options?: ListOptions): Promise<DriveItem[]> {
    return (await this.listFolderIfExists(folder, options)) ?? []
  }

  /**
   * Like `listFolder`, but `undefined` when the folder doesn't exist on the homeserver, such as
   * after it was moved or deleted elsewhere. Folders exist only while they contain a file.
   */
  async listFolderIfExists(
    folder: StoragePath,
    options: ListOptions = {},
  ): Promise<DriveItem[] | undefined> {
    const listed = await this.listPaths(folder, { shallow: true })
    if (!listed) return undefined
    const paths = options.everything ? listed : listed.filter((path) => this.isVisible(path))
    return mapWithConcurrency(paths, STATS_CONCURRENCY, (path) => this.describe(path))
  }

  /** The names directly inside `folder`, including hidden ones, for conflict checks. */
  async childNames(folder: StoragePath): Promise<Set<string>> {
    const paths = (await this.listPaths(folder, { shallow: true })) ?? []
    return new Set(paths.map(nameOf))
  }

  /** Every file below `folder` at any depth, including folder markers. */
  async listFilesBelow(folder: StoragePath): Promise<StoragePath[]> {
    return (await this.listPaths(folder, { shallow: false })) ?? []
  }

  /** An item with its current metadata, or `undefined` when the file doesn't exist. */
  async stat(path: StoragePath): Promise<DriveItem | undefined> {
    if (isFolderPath(path)) return itemFromPath(path)
    const stats = await this.files.stats(path)
    return stats ? withStats(itemFromPath(path), stats) : undefined
  }

  /** Whether a listing should show `path`. */
  isVisible(path: StoragePath) {
    if (nameOf(path) === FOLDER_MARKER) return false
    return !this.hiddenFolders.some((hidden) => path.startsWith(hidden))
  }

  private async describe(path: StoragePath): Promise<DriveItem> {
    const item = itemFromPath(path)
    if (item.kind === 'folder') return item
    const stats = await this.files.stats(path)
    return stats ? withStats(item, stats) : item
  }

  /** Every path in `folder`, page by page; `undefined` when the folder doesn't exist. */
  private async listPaths(folder: StoragePath, options: { shallow: boolean }) {
    const paths: StoragePath[] = []
    let cursor: string | null = null

    try {
      // The last listed URL is the cursor for the next page.
      for (;;) {
        const page: string[] = await this.files.list(
          folder,
          cursor,
          false,
          LIST_PAGE_SIZE,
          options.shallow,
        )
        paths.push(...page.map((url) => pathFromListedUrl(url, this.ownerZ32)))
        if (page.length < LIST_PAGE_SIZE) break
        cursor = page[page.length - 1]
      }
    } catch (error) {
      if (isNotFound(error)) return undefined
      throw error
    }

    return paths
  }
}

function withStats(item: DriveItem, stats: ResourceStats): DriveItem {
  return {
    ...item,
    sizeBytes: stats.contentLength,
    contentType: stats.contentType,
    modifiedMs: stats.lastModifiedMs,
  }
}
