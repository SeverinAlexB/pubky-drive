// Reading and following homeserver event streams.

import type { Event as PubkyEvent, EventStreamBuilder, Session } from '@synonymdev/pubky'
import { MAX_EVENT_BYTES } from '../config'
import { fromListedPath, toWirePath, type StoragePath } from '../drive/paths'
import { pubky } from './client'

/** A write or delete under one of the user's paths. */
export interface StorageEvent {
  type: 'PUT' | 'DEL'
  path: StoragePath
  /** Position in the homeserver's event log. Later events have larger cursors. */
  cursor: string
}

/** A builder for the session owner's events below `folder`, authorized for private folders. */
function eventsBelow(session: Session, folder: StoragePath, cursor: string | null = null) {
  const builder = pubky
    .eventStreamForUser(session.info.publicKey, cursor)
    .path(toWirePath(folder))
    .maxEventBytes(MAX_EVENT_BYTES)
  return folder.startsWith('/priv/') ? builder.session(session) : builder
}

/** The newest `limit` events below `folder`, newest first. */
export async function readLatestEvents(session: Session, folder: StoragePath, limit: number) {
  return readAll(eventsBelow(session, folder).reverse().limit(limit))
}

/**
 * Calls `onEvent` for every new event below `folder` until the returned `stop` is called.
 * Past events are skipped.
 */
export async function followEvents(
  session: Session,
  folder: StoragePath,
  onEvent: (event: StorageEvent) => void,
): Promise<() => Promise<void>> {
  // A live stream starts with the full history, so start after the newest existing event.
  const [newest] = await readLatestEvents(session, folder, 1)
  const stream = await eventsBelow(session, folder, newest?.cursor ?? null)
    .live()
    .subscribe()
  const reader = stream.getReader()
  let stopped = false

  void (async () => {
    try {
      while (!stopped) {
        const { done, value } = await reader.read()
        if (done) return
        onEvent(toStorageEvent(value as PubkyEvent))
      }
    } catch (error) {
      if (!stopped) console.warn('Live updates stopped', error)
    }
  })()

  return async () => {
    stopped = true
    await reader.cancel().catch(() => {})
  }
}

async function readAll(builder: EventStreamBuilder) {
  const events: StorageEvent[] = []
  for await (const event of (await builder.subscribe()) as unknown as AsyncIterable<PubkyEvent>) {
    events.push(toStorageEvent(event))
  }
  return events
}

function toStorageEvent(event: PubkyEvent): StorageEvent {
  return {
    type: event.eventType === 'DEL' ? 'DEL' : 'PUT',
    path: fromListedPath(event.resource.path),
    cursor: event.cursor,
  }
}
