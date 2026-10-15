import { describe, expect, test, vi } from 'vitest'
import { MemoryFileStore } from './memoryFileStore'
import { RetryingFileStore, TokenBucket } from './retryingFileStore'

const httpError = (statusCode: number) =>
  Object.assign(new Error(String(statusCode)), { data: { statusCode } })
const instant = { delayMs: (attempt: number) => attempt * 1000, wait: async () => {} }

describe('RetryingFileStore', () => {
  test('retries rate-limited requests and tells listeners how long it waits', async () => {
    const inner = new MemoryFileStore()
    inner.seed('/pub/a.txt', 'a')
    const getBytes = vi
      .spyOn(inner, 'getBytes')
      .mockRejectedValueOnce(httpError(429))
      .mockRejectedValueOnce(httpError(503))
    const store = new RetryingFileStore(inner, instant)
    const waits: number[] = []
    store.onBusy((ms) => waits.push(ms))

    expect(new TextDecoder().decode(await store.getBytes('/pub/a.txt'))).toBe('a')
    expect(getBytes).toHaveBeenCalledTimes(3)
    expect(waits).toEqual([1000, 2000])
  })

  test('passes other errors through on the first attempt', async () => {
    const store = new RetryingFileStore(new MemoryFileStore(), instant)
    await expect(store.getBytes('/pub/missing.txt')).rejects.toMatchObject({
      data: { statusCode: 404 },
    })
  })

  test('gives up after the last attempt with the homeserver’s error', async () => {
    const inner = new MemoryFileStore()
    const stats = vi.spyOn(inner, 'stats').mockRejectedValue(httpError(429))
    const store = new RetryingFileStore(inner, { ...instant, maxAttempts: 3 })

    await expect(store.stats('/pub/a.txt')).rejects.toMatchObject({ data: { statusCode: 429 } })
    expect(stats).toHaveBeenCalledTimes(3)
  })

  test('paces public deletes, but not private ones', async () => {
    const inner = new MemoryFileStore()
    inner.seed('/pub/a.txt')
    inner.seed('/priv/b.txt')
    const take = vi.fn(async () => {})
    const store = new RetryingFileStore(inner, {
      ...instant,
      publicDeletes: { take } as unknown as TokenBucket,
    })

    await store.delete('/pub/a.txt')
    await store.delete('/priv/b.txt')
    expect(take).toHaveBeenCalledTimes(1)
  })
})

describe('TokenBucket', () => {
  test('allows the burst at once, then one permit per interval, in call order', async () => {
    let now = 0
    const waits: number[] = []
    const bucket = new TokenBucket(
      5,
      2,
      () => now,
      async (ms) => {
        waits.push(ms)
        now += ms
      },
    )

    await Promise.all([bucket.take(), bucket.take(), bucket.take(), bucket.take()])

    expect(waits).toEqual([200, 200])
  })
})
