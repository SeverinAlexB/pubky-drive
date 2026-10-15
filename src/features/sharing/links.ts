import type { Address } from '@synonymdev/pubky'
// Addresses of public items. See docs/spec/09-sharing.md.

import { fromWirePath, toWirePath, type StoragePath } from '../../drive/paths'

/**
 * `pubky<key>/pub/…`, the address other Pubky apps understand. Segments are wire-encoded. Only
 * public paths have a readable address.
 */
export function pubkyAddress(ownerZ32: string, path: StoragePath): Address {
  return `pubky${ownerZ32}${toWirePath(path)}` as Address
}

/** A link that opens the item in this app's public viewer, without signing in. */
export function viewerLink(ownerZ32: string, path: StoragePath) {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/view/${pubkyAddress(ownerZ32, path)}`
}

/** The owner and plain path of a viewer address, or `undefined` when it isn't a public address. */
export function parseViewerAddress(
  address: string,
): { ownerZ32: string; path: StoragePath } | undefined {
  const match = /^pubky([a-z0-9]{52})(\/pub\/.*)$/.exec(address)
  if (!match) return undefined
  try {
    return { ownerZ32: match[1], path: fromWirePath(match[2]) }
  } catch {
    return undefined
  }
}

export function isPublicPath(path: StoragePath) {
  return path.startsWith('/pub/')
}
