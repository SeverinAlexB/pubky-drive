import { describe, expect, test, vi } from 'vitest'
import { backoffDelayMs } from './backoff'
import { EventHub } from './eventHub'
import type { EventSource, StorageEvent } from './events'

const event = (cursor: number, path = `/pub/pubky-drive/files/${cursor}.txt`): StorageEvent => ({
  type: 'PUT',
  path: path as StorageEvent['path'],
  cursor: String(cursor),
})

/** A live stream the test feeds by hand. */
function controllableStream() {
  let controller!: ReadableStreamDefaultController<StorageEvent>
  const stream = new ReadableStream<StorageEvent>({ start: (c) => (controller = c) })
  return {
    stream,
    push: (e: StorageEvent) => controller.enqueue(e),
    close: () => controller.close(),
    fail: (e: unknown) => controller.error(e),
  }
}

const rateLimited = () => Object.assign(new Error('429'), { data: { statusCode: 429 } })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('EventHub', () => {
  test('loads the history once, then follows one live stream from the newest event', async () => {
    const live = controllableStream()
    const source: EventSource = {
      latest: vi.fn(async () => [event(7), event(6)]),
      live: vi.fn(async () => live.stream),
    }
    const hub = new EventHub(source)
    const received: string[] = []
    hub.subscribe((e) => received.push(e.cursor))

    void hub.start()
    await hub.ready
    await flush()
    live.push(event(8))
    await flush()

    expect(source.latest).toHaveBeenCalledTimes(1)
    expect(source.live).toHaveBeenCalledWith('7')
    expect(received).toEqual(['8'])
    expect(hub.history().map((e) => e.cursor)).toEqual(['8', '7', '6'])
    hub.stop()
  })

  test('reconnects after a dropped stream from the last event it saw, with growing delays', async () => {
    const first = controllableStream()
    const second = controllableStream()
    const source: EventSource = {
      latest: async () => [event(1)],
      live: vi
        .fn()
        .mockResolvedValueOnce(first.stream)
        .mockRejectedValueOnce(rateLimited())
        .mockResolvedValueOnce(second.stream),
    }
    const waits: number[] = []
    const hub = new EventHub(source, {
      delayMs: (attempt) => attempt * 100,
      wait: async (ms) => {
        waits.push(ms)
      },
      now: () => 0,
    })

    void hub.start()
    await hub.ready
    await flush()
    first.push(event(2))
    await flush()
    first.fail(new Error('connection reset'))
    await flush()
    await flush()
    await flush()

    expect(vi.mocked(source.live).mock.calls).toEqual([['1'], ['2'], ['2']])
    expect(waits).toEqual([100, 200])
    hub.stop()
  })

  test('retries a rate-limited history request before following', async () => {
    const live = controllableStream()
    const source: EventSource = {
      latest: vi
        .fn()
        .mockRejectedValueOnce(rateLimited())
        .mockResolvedValueOnce([event(3)]),
      live: vi.fn(async () => live.stream),
    }
    const hub = new EventHub(source, { wait: async () => {} })

    void hub.start()
    await hub.ready
    await flush()

    expect(source.latest).toHaveBeenCalledTimes(2)
    expect(source.live).toHaveBeenCalledWith('3')
    hub.stop()
  })

  test('a stopped hub starts again, as React does with effects in development', async () => {
    const live = controllableStream()
    const source: EventSource = {
      latest: vi.fn(async () => [event(4)]),
      live: vi.fn(async () => live.stream),
    }
    const hub = new EventHub(source)

    void hub.start()
    hub.stop()
    void hub.start()
    await hub.ready
    await flush()
    await flush()

    expect(hub.history().map((e) => e.cursor)).toEqual(['4'])
    expect(source.live).toHaveBeenCalledTimes(1)
    hub.stop()
  })

  test('stopping ends the loop without reconnecting', async () => {
    const live = controllableStream()
    const source: EventSource = { latest: async () => [], live: vi.fn(async () => live.stream) }
    const hub = new EventHub(source)

    const running = hub.start()
    await hub.ready
    await flush()
    hub.stop()
    await running

    expect(source.live).toHaveBeenCalledTimes(1)
  })
})

test('backoff grows exponentially up to a cap, with jitter', () => {
  const middle = () => 0.5
  expect([1, 2, 3, 6, 10].map((attempt) => backoffDelayMs(attempt, 1000, 30_000, middle))).toEqual([
    1000, 2000, 4000, 30_000, 30_000,
  ])
  expect(backoffDelayMs(1, 1000, 30_000, () => 0)).toBe(750)
  expect(backoffDelayMs(1, 1000, 30_000, () => 1)).toBe(1250)
})
