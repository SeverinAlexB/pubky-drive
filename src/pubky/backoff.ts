/** Retry delays: exponential from `baseMs`, capped at `maxMs`, with ±25% jitter so clients spread out. */
export function backoffDelayMs(
  attempt: number,
  baseMs = 1000,
  maxMs = 30_000,
  random = Math.random,
) {
  const exponential = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1))
  return Math.round(exponential * (0.75 + random() * 0.5))
}

export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}
