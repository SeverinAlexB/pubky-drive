// Homeserver event streams. The app reads them through one EventHub per session (eventHub.ts),
// because the production homeserver allows only one event-stream request per second per IP.

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

/** Where an EventHub gets its events from. */
export interface EventSource {
  /** The newest `limit` events, newest first. */
  latest(limit: number): Promise<StorageEvent[]>
  /** Events after `cursor` as they happen. The stream ends when the connection closes. */
  live(cursor: string | null): Promise<ReadableStream<StorageEvent>>
}

/** Events of the session owner below any of `folders`, in one request per call. */
export function homeserverEventSource(
  session: Session,
  folders: readonly StoragePath[],
): EventSource {
  const builder = (cursor: string | null) => {
    let next = pubky
      .eventStreamForUser(session.info.publicKey, cursor)
      .maxEventBytes(MAX_EVENT_BYTES)
    for (const folder of folders) next = next.path(toWirePath(folder))
    // Private folders need the session; it doesn't hurt public ones.
    return folders.some((folder) => folder.startsWith('/priv/')) ? next.session(session) : next
  }

  return {
    async latest(limit) {
      const events: StorageEvent[] = []
      for await (const event of await subscribe(builder(null).reverse().limit(limit))) {
        events.push(toStorageEvent(event))
      }
      return events
    },
    async live(cursor) {
      const stream = (await builder(cursor).live().subscribe()) as ReadableStream<PubkyEvent>
      return stream.pipeThrough(
        new TransformStream<PubkyEvent, StorageEvent>({
          transform: (event, controller) => controller.enqueue(toStorageEvent(event)),
        }),
      )
    },
  }
}

async function subscribe(builder: EventStreamBuilder) {
  return (await builder.subscribe()) as unknown as AsyncIterable<PubkyEvent>
}

function toStorageEvent(event: PubkyEvent): StorageEvent {
  return {
    type: event.eventType === 'DEL' ? 'DEL' : 'PUT',
    path: fromListedPath(event.resource.path),
    cursor: event.cursor,
  }
}
