// Homeserver paths as the app uses them.
//
// The app keeps **plain paths**: absolute, unencoded paths such as `/pub/x/a b.txt`, the form
// that `session.storage` expects. Folder paths end with `/`. The Homeserver APIs use two other
// forms (see docs/design.md, "Path encoding"):
//
// - wire paths, with each segment percent-encoded once, for public addresses and event filters;
// - listed paths, with each segment percent-encoded twice, returned by `list()` and events.

import type { Path } from '@synonymdev/pubky'

/** A plain absolute Homeserver path. Folder paths end with `/`. */
export type StoragePath = Path

/** The two storage areas: `/pub/` is readable by anyone, `/priv/` only with authorization. */
export type Area = 'public' | 'private'

const AREA_PREFIXES: Record<Area, StoragePath> = {
  public: '/pub/',
  private: '/priv/',
}

export function areaPrefix(area: Area): StoragePath {
  return AREA_PREFIXES[area]
}

export function areaOfPath(path: StoragePath): Area {
  return path.startsWith(AREA_PREFIXES.public) ? 'public' : 'private'
}

export function isFolderPath(path: string) {
  return path.endsWith('/')
}

/** The last segment of a path, without the trailing slash of a folder. */
export function nameOf(path: string) {
  const trimmed = isFolderPath(path) ? path.slice(0, -1) : path
  return trimmed.slice(trimmed.lastIndexOf('/') + 1)
}

/** The folder that contains `path`. */
export function parentOf(path: StoragePath): StoragePath {
  const trimmed = isFolderPath(path) ? path.slice(0, -1) : path
  return trimmed.slice(0, trimmed.lastIndexOf('/') + 1) as StoragePath
}

export function childPath(folder: StoragePath, name: string, kind: 'file' | 'folder'): StoragePath {
  return `${folder}${name}${kind === 'folder' ? '/' : ''}` as StoragePath
}

/** Whether `path` is `folder` itself or anywhere below it. */
export function isWithin(path: string, folder: string) {
  return path.startsWith(folder)
}

/** Replaces the `from` prefix of `path` with `to`. Both prefixes must be folder paths. */
export function rebasePath(path: StoragePath, from: StoragePath, to: StoragePath): StoragePath {
  if (!isWithin(path, from)) throw new Error(`${path} isn't inside ${from}`)
  return `${to}${path.slice(from.length)}` as StoragePath
}

/** Percent-encodes a name with URL path-segment rules, as the Homeserver stores it. */
export function encodePathSegment(name: string) {
  let encoded = ''
  for (const char of name) {
    encoded += SEGMENT_KEPT_ASCII.test(char) ? char : percentEncodeUtf8(char)
  }
  return encoded
}

/** Converts a plain path to its wire form, for public addresses and event filters. */
export function toWirePath(path: StoragePath) {
  return path.split('/').map(encodePathSegment).join('/')
}

/** Converts a wire path, such as one from a viewer link, back to a plain path. */
export function fromWirePath(wirePath: string): StoragePath {
  return wirePath.split('/').map(decodeURIComponent).join('/') as StoragePath
}

/** Converts a path returned by events (each segment encoded twice) to a plain path. */
export function fromListedPath(listedPath: string): StoragePath {
  return listedPath
    .split('/')
    .map((segment) => decodeURIComponent(decodeURIComponent(segment)))
    .join('/') as StoragePath
}

/**
 * Converts an entry URL returned by `list()` (`pubky://<public key>/<listed path>`) to a plain
 * path. Throws when the URL belongs to another user, because a listing must never refer to
 * someone else's files.
 */
export function pathFromListedUrl(url: string, ownerZ32: string): StoragePath {
  const prefix = `pubky://${ownerZ32}/`
  if (!url.startsWith(prefix)) {
    throw new Error('The homeserver listed a file of another user.')
  }
  return fromListedPath(url.slice(prefix.length - 1))
}

// ASCII characters that URL path-segment encoding leaves as they are: everything printable except
// space, " # % / < > ? ` { } and DEL.
const SEGMENT_KEPT_ASCII = /^[!$&'()*+,\-.0-9:;=@A-Z[\\\]^_a-z|~]$/

function percentEncodeUtf8(char: string) {
  return [...new TextEncoder().encode(char)]
    .map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`)
    .join('')
}
