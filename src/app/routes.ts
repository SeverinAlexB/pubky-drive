// Hash routes. See docs/spec/02-navigation.md.

import { useSyncExternalStore } from 'react'
import type { Area } from '../drive/paths'

export type Route =
  | { view: 'my-drive' }
  /** `folder` is the path inside the area root, without leading or trailing slash ('' for the root). */
  | { view: 'folder'; area: Area; folder: string }
  | { view: 'recent' }
  | { view: 'starred' }
  | { view: 'bin' }
  | { view: 'search'; query: string }
  /** `address` is a wire-encoded Pubky address such as `pubky<key>/pub/a%20b.txt`. */
  | { view: 'viewer'; address: string }

export function parseRoute(hash: string): Route {
  const [pathPart, queryPart = ''] = hash.replace(/^#\/?/, '').split('?')
  const segments = pathPart.split('/').filter(Boolean)

  switch (segments[0]) {
    case 'drive': {
      const area = segments[1]
      if (area !== 'public' && area !== 'private') return { view: 'my-drive' }
      return { view: 'folder', area, folder: segments.slice(2).map(safeDecode).join('/') }
    }
    case 'recent':
    case 'starred':
    case 'bin':
      return { view: segments[0] }
    case 'search':
      return { view: 'search', query: new URLSearchParams(queryPart).get('q') ?? '' }
    case 'view':
      return { view: 'viewer', address: pathPart.slice('view/'.length) }
    default:
      return { view: 'my-drive' }
  }
}

export function routeHash(route: Route): string {
  switch (route.view) {
    case 'my-drive':
      return '#/drive'
    case 'folder': {
      const folder = route.folder.split('/').filter(Boolean).map(encodeURIComponent).join('/')
      return `#/drive/${route.area}${folder ? `/${folder}` : ''}`
    }
    case 'search':
      return `#/search?${new URLSearchParams({ q: route.query })}`
    case 'viewer':
      return `#/view/${route.address}`
    default:
      return `#/${route.view}`
  }
}

export function navigate(route: Route) {
  window.location.hash = routeHash(route)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash)
  return parseRoute(hash)
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}
