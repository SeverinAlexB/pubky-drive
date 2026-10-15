// Handling the homeserver's rate limits at the storage boundary. The production homeserver limits,
// among others, deleting public files to 5 per second per user (burst 50); see
// e2e/homeserver-rate-limited.toml.

import type { ResourceStats } from '@synonymdev/pubky'
import { backoffDelayMs, sleep } from '../pubky/backoff'
import { statusCodeOf } from './errors'
import type { StoragePath } from './paths'
import type { FileStore } from './storage'

/** Statuses that mean "try again later": rate limited, or temporarily unavailable. */
const RETRYABLE_STATUSES = new Set([429, 503])

/**
 * Hands out at most `ratePerSecond` permits per second, after an initial `burst`. Callers wait
 * for a permit instead of being refused.
 */
export class TokenBucket {
  private tokens: number
  private updatedAt: number
  private queue: Promise<void> = Promise.resolve()
  private readonly ratePerSecond: number
  private readonly burst: number
  private readonly now: () => number
  private readonly wait: (ms: number) => Promise<void>

  constructor(
    ratePerSecond: number,
    burst: number,
    now = Date.now,
    wait = (ms: number) => sleep(ms),
  ) {
    this.ratePerSecond = ratePerSecond
    this.burst = burst
    this.tokens = burst
    this.now = now
    this.updatedAt = now()
    this.wait = wait
  }

  /** Resolves when a permit is available. Permits are handed out in call order. */
  take(): Promise<void> {
    const turn = this.queue.then(() => this.takeNow())
    this.queue = turn
    return turn
  }

  private async takeNow() {
    this.refill()
    if (this.tokens < 1) {
      await this.wait(((1 - this.tokens) / this.ratePerSecond) * 1000)
      this.refill()
    }
    this.tokens -= 1
  }

  private refill() {
    const now = this.now()
    this.tokens = Math.min(
      this.burst,
      this.tokens + ((now - this.updatedAt) / 1000) * this.ratePerSecond,
    )
    this.updatedAt = now
  }
}

/** Told how long the store waits before retrying a rate-limited request. */
export type BusyListener = (waitMs: number) => void

interface RetryOptions {
  maxAttempts?: number
  delayMs?: (attempt: number) => number
  wait?: (ms: number) => Promise<void>
  publicDeletes?: TokenBucket
}

/**
 * A FileStore that retries rate-limited requests with backoff and paces public deletes below
 * the homeserver's limit. Other errors pass through unchanged on the first attempt.
 */
export class RetryingFileStore implements FileStore {
  private readonly inner: FileStore
  private readonly options: Required<RetryOptions>
  private readonly busyListeners = new Set<BusyListener>()

  constructor(inner: FileStore, options: RetryOptions = {}) {
    this.inner = inner
    this.options = {
      maxAttempts: 8,
      delayMs: (attempt) => backoffDelayMs(attempt),
      wait: (ms) => sleep(ms),
      // Slightly below production's 5 per second, burst 50, to leave room for other tabs.
      publicDeletes: new TokenBucket(4, 40),
      ...options,
    }
  }

  /** Calls `listener` whenever a request waits for a retry, until the returned function is called. */
  onBusy(listener: BusyListener) {
    this.busyListeners.add(listener)
    return () => {
      this.busyListeners.delete(listener)
    }
  }

  list(
    path: StoragePath,
    cursor: string | null,
    reverse: boolean,
    limit: number,
    shallow: boolean,
  ) {
    return this.retry(() => this.inner.list(path, cursor, reverse, limit, shallow))
  }

  stats(path: StoragePath): Promise<ResourceStats | undefined> {
    return this.retry(() => this.inner.stats(path))
  }

  getBytes(path: StoragePath) {
    return this.retry(() => this.inner.getBytes(path))
  }

  putBytes(path: StoragePath, body: Uint8Array) {
    return this.retry(() => this.inner.putBytes(path, body))
  }

  getJson(path: StoragePath) {
    return this.retry(() => this.inner.getJson(path))
  }

  putJson(path: StoragePath, body: unknown) {
    return this.retry(() => this.inner.putJson(path, body))
  }

  async delete(path: StoragePath) {
    if (path.startsWith('/pub/')) await this.options.publicDeletes.take()
    return this.retry(() => this.inner.delete(path))
  }

  private async retry<T>(request: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await request()
      } catch (error) {
        const status = statusCodeOf(error)
        if (
          status === undefined ||
          !RETRYABLE_STATUSES.has(status) ||
          attempt >= this.options.maxAttempts
        )
          throw error
        const waitMs = this.options.delayMs(attempt)
        for (const listener of this.busyListeners) listener(waitMs)
        await this.options.wait(waitMs)
      }
    }
  }
}
