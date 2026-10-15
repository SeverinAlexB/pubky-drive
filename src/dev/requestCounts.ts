// Development only: counts the app's HTTP requests to homeservers by kind, and the 429 responses,
// so that request storms and rate limiting are visible while testing. The SDK sends its requests
// through the global `fetch`, which this module wraps.

/** What a request does, for the counters. */
export type RequestKind =
  | 'event stream'
  | 'list'
  | 'read'
  | 'metadata'
  | 'write'
  | 'delete'
  | 'session'
  | 'auth relay'
  | 'other'

export interface RequestCounts {
  total: number
  byKind: Partial<Record<RequestKind, number>>
  /** Responses with status 429, by kind. */
  rateLimited: Partial<Record<RequestKind, number>>
  /** The most recent rate-limited request, as method and path. */
  lastRateLimited?: string
}

type Listener = (counts: RequestCounts) => void

let counts: RequestCounts = { total: 0, byKind: {}, rateLimited: {} }
const listeners = new Set<Listener>()
let installed = false

/** Wraps the global `fetch` to count requests. Safe to call more than once. */
export function installRequestMonitor() {
  if (installed) return
  installed = true
  const originalFetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // Read method and URL without constructing a Request, which could consume a streamed body.
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href)
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const kind = classify(method, url)
    record(kind)
    const response = await originalFetch(input, init)
    if (response.status === 429) recordRateLimited(kind, `${method} ${url.pathname}`)
    return response
  }
}

export function subscribeToRequestCounts(listener: Listener) {
  listeners.add(listener)
  listener(counts)
  return () => {
    listeners.delete(listener)
  }
}

export function resetRequestCounts() {
  counts = { total: 0, byKind: {}, rateLimited: {} }
  publish()
}

/** The kind of a homeserver request, from its method and URL. Exported for tests. */
export function classify(method: string, url: URL): RequestKind {
  const path = url.pathname
  if (path.includes('/events-stream') || path.endsWith('/events/')) return 'event stream'
  if (path.includes('/inbox/') || path.startsWith('/link')) return 'auth relay'
  if (path.endsWith('/session') || path.includes('/session/')) return 'session'
  if (!/\/(pub|priv)\//.test(path)) return 'other'

  switch (method) {
    case 'GET':
      return path.endsWith('/') ? 'list' : 'read'
    case 'HEAD':
      return 'metadata'
    case 'PUT':
      return 'write'
    case 'DELETE':
      return 'delete'
    default:
      return 'other'
  }
}

function record(kind: RequestKind) {
  counts = {
    ...counts,
    total: counts.total + 1,
    byKind: { ...counts.byKind, [kind]: (counts.byKind[kind] ?? 0) + 1 },
  }
  publish()
}

function recordRateLimited(kind: RequestKind, request: string) {
  counts = {
    ...counts,
    rateLimited: { ...counts.rateLimited, [kind]: (counts.rateLimited[kind] ?? 0) + 1 },
    lastRateLimited: request,
  }
  publish()
}

function publish() {
  for (const listener of listeners) listener(counts)
}
