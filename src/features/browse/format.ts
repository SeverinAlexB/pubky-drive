// Dates and sizes as the file list shows them. See docs/spec/03-file-list.md.

const UNITS = ['KB', 'MB', 'GB', 'TB']

/** `47 bytes`, `103 KB`, `2.2 MB`: one decimal place below 10 of a unit, 1 KB = 1,024 bytes. */
export function formatSize(bytes: number | undefined) {
  if (bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`

  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value)
  return `${rounded} ${UNITS[unit]}`
}

/** Time of day for today, day and month for this year, and the full date otherwise. */
export function formatDate(timeMs: number | undefined, nowMs = Date.now(), locale?: string) {
  if (timeMs === undefined) return '—'
  const date = new Date(timeMs)
  const now = new Date(nowMs)

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** A long date and time for the details pane. */
export function formatDateTime(timeMs: number | undefined, locale?: string) {
  if (timeMs === undefined) return '—'
  return new Date(timeMs).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

/** Heading of the day group that `timeMs` belongs to, for Recent and the bin. */
export function dayGroupOf(timeMs: number | undefined, nowMs = Date.now()) {
  if (timeMs === undefined) return 'Older'
  const startOfToday = new Date(nowMs).setHours(0, 0, 0, 0)
  const dayMs = 24 * 60 * 60 * 1000
  if (timeMs >= startOfToday) return 'Today'
  if (timeMs >= startOfToday - dayMs) return 'Yesterday'
  if (timeMs >= startOfToday - 6 * dayMs) return 'Earlier this week'
  if (timeMs >= startOfToday - 29 * dayMs) return 'Earlier this month'
  return 'Older'
}

/** `pubkyabcd…wxyz`: enough of a public key to recognize it. */
export function shortKey(publicKey: string) {
  const z32 = publicKey.replace(/^pubky/, '')
  return `pubky${z32.slice(0, 4)}…${z32.slice(-4)}`
}
