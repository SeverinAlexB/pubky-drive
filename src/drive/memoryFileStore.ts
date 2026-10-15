// An in-memory stand-in for a homeserver's session storage, for tests. It reproduces the
// behaviour observed on a 0.16.1 testnet: implicit folders, double-encoded listed URLs, 404 for
// missing folders, 409 for file/folder collisions and 400 for deleting a folder.

import type { ResourceStats } from '@synonymdev/pubky'
import { encodePathSegment, isFolderPath, type StoragePath } from './paths'
import type { FileStore } from './storage'

interface StoredFile {
  bytes: Uint8Array
  modifiedMs: number
}

export class MemoryFileStore implements FileStore {
  readonly ownerZ32: string
  readonly stored = new Map<string, StoredFile>()
  private clockMs = Date.UTC(2026, 9, 15, 8, 0, 0)

  constructor(ownerZ32 = 'testowner') {
    this.ownerZ32 = ownerZ32
  }

  /** Paths of every stored file, sorted. */
  paths() {
    return [...this.stored.keys()].sort()
  }

  async list(
    path: StoragePath,
    cursor: string | null,
    reverse: boolean,
    limit: number,
    shallow: boolean,
  ) {
    const below = this.paths().filter((stored) => stored.startsWith(path))
    if (below.length === 0) throw httpError(404, 'Directory Not Found')

    const entries = shallow ? directChildren(path, below) : below
    const urls = entries.map((entry) => this.listedUrl(entry))
    if (reverse) urls.reverse()
    const start = cursor ? urls.indexOf(cursor) + 1 : 0
    return urls.slice(start, start + limit)
  }

  async stats(path: StoragePath): Promise<ResourceStats | undefined> {
    const file = this.stored.get(path)
    if (!file) return undefined
    return {
      contentLength: file.bytes.length,
      lastModifiedMs: file.modifiedMs,
      etag: `${file.modifiedMs}`,
    }
  }

  async getBytes(path: StoragePath) {
    const file = this.stored.get(path)
    if (!file) throw httpError(404, 'Not Found')
    return file.bytes
  }

  async putBytes(path: StoragePath, body: Uint8Array) {
    if (isFolderPath(path)) throw httpError(400, 'Target path must be a file')
    const isParentOfFile = this.paths().some((stored) => stored.startsWith(`${path}/`))
    const hasFileAsParent = ancestorsOf(path).some((ancestor) => this.stored.has(ancestor))
    if (isParentOfFile || hasFileAsParent) throw httpError(409, 'File/folder path collision')

    this.clockMs += 1000
    this.stored.set(path, { bytes: body, modifiedMs: this.clockMs })
  }

  async getJson(path: StoragePath) {
    return JSON.parse(new TextDecoder().decode(await this.getBytes(path)))
  }

  async putJson(path: StoragePath, body: unknown) {
    await this.putBytes(path, new TextEncoder().encode(JSON.stringify(body)))
  }

  async delete(path: StoragePath) {
    if (isFolderPath(path)) throw httpError(400, 'Target path must be a file')
    if (!this.stored.delete(path)) throw httpError(404, 'Not Found')
  }

  /** Writes a text file directly, for test setup. */
  seed(path: string, text = '') {
    this.clockMs += 1000
    this.stored.set(path, { bytes: new TextEncoder().encode(text), modifiedMs: this.clockMs })
  }

  text(path: string) {
    const file = this.stored.get(path)
    return file && new TextDecoder().decode(file.bytes)
  }

  private listedUrl(path: string) {
    const listed = path
      .split('/')
      .map((segment) => encodePathSegment(encodePathSegment(segment)))
      .join('/')
    return `pubky://${this.ownerZ32}${listed}`
  }
}

function directChildren(folder: string, below: string[]) {
  const children = new Set<string>()
  for (const path of below) {
    const rest = path.slice(folder.length)
    const slash = rest.indexOf('/')
    children.add(slash === -1 ? path : `${folder}${rest.slice(0, slash + 1)}`)
  }
  return [...children].sort()
}

function ancestorsOf(path: string) {
  const segments = path.split('/')
  return segments.slice(2, -1).map((_, index) => segments.slice(0, index + 3).join('/'))
}

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(`${statusCode} ${message}`), {
    name: 'RequestError',
    data: { statusCode },
  })
}
