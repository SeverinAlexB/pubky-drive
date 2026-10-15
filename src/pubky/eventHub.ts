import { backoffDelayMs, sleep } from './backoff'
import type { EventSource, StorageEvent } from './events'

export type EventListener = (event: StorageEvent) => void

interface EventHubOptions {
  /** How many past events to load at the start, for Recent. */
  historyLimit?: number
  /** A live stream that stayed open this long counts as healthy, which resets the backoff. */
  healthyAfterMs?: number
  delayMs?: (attempt: number) => number
  wait?: (ms: number, signal: AbortSignal) => Promise<void>
  now?: () => number
}

const MAX_HISTORY = 1000

/**
 * The session's one connection to the homeserver's event log. It loads the recent history once,
 * then follows a single live stream, reconnecting with backoff from the last event it saw, so
 * listeners miss nothing. Everything in the app that needs events subscribes here instead of
 * opening its own stream: the production homeserver allows one event-stream request per second.
 */
export class EventHub {
  private readonly source: EventSource
  private readonly options: Required<EventHubOptions>
  private readonly listeners = new Set<EventListener>()
  private abort = new AbortController()
  private events: StorageEvent[] = []
  private cursor: string | null = null
  private historyLoaded = false
  private resolveHistory!: () => void
  private reader?: ReadableStreamDefaultReader<StorageEvent>

  /** Resolves once the history has loaded. Until then, `history()` is empty. */
  readonly ready: Promise<void>

  constructor(source: EventSource, options: EventHubOptions = {}) {
    this.source = source
    this.options = {
      historyLimit: 300,
      healthyAfterMs: 10_000,
      delayMs: (attempt) => backoffDelayMs(attempt),
      wait: sleep,
      now: Date.now,
      ...options,
    }
    this.ready = new Promise((resolve) => (this.resolveHistory = resolve))
  }

  /**
   * Starts loading and following events; a stopped hub can start again and keeps its history.
   * The returned promise settles when the hub stops.
   */
  start() {
    this.abort.abort()
    this.abort = new AbortController()
    return this.run(this.abort.signal)
  }

  stop() {
    this.abort.abort()
    void this.reader?.cancel().catch(() => {})
  }

  /** Calls `listener` for every new event until the returned function is called. */
  subscribe(listener: EventListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Known events, newest first: the loaded history and everything received since. */
  history(): readonly StorageEvent[] {
    return this.events
  }

  private async run(signal: AbortSignal) {
    let failures = 0
    while (!signal.aborted) {
      const openedAt = this.options.now()
      try {
        if (!this.historyLoaded) await this.loadHistory(signal)
        if (signal.aborted) return
        await this.follow(signal)
      } catch (error) {
        if (signal.aborted) return
        console.warn('Event stream interrupted', error)
      }
      if (signal.aborted) return

      // A stream that stayed open for a while was healthy; start the backoff over.
      failures = this.options.now() - openedAt >= this.options.healthyAfterMs ? 1 : failures + 1
      await this.options.wait(this.options.delayMs(failures), signal)
    }
  }

  private async loadHistory(signal: AbortSignal) {
    const latest = await this.source.latest(this.options.historyLimit)
    if (signal.aborted) return
    this.events = latest
    this.cursor = latest[0]?.cursor ?? null
    this.historyLoaded = true
    this.resolveHistory()
  }

  private async follow(signal: AbortSignal) {
    const stream = await this.source.live(this.cursor)
    if (signal.aborted) {
      await stream.cancel().catch(() => {})
      return
    }
    this.reader = stream.getReader()
    for (;;) {
      const { done, value } = await this.reader.read()
      if (done) return
      this.receive(value)
    }
  }

  private receive(event: StorageEvent) {
    this.cursor = event.cursor
    this.events = [event, ...this.events].slice(0, MAX_HISTORY)
    for (const listener of this.listeners) listener(event)
  }
}
