// The filter chips above the file list. See docs/spec/03-file-list.md, "Filter bar".

import type { FileType } from '../../drive/items'

export const TYPE_FILTERS: { value: FileType; label: string }[] = [
  { value: 'folder', label: 'Folders' },
  { value: 'image', label: 'Images' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'text', label: 'Text and code' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'archive', label: 'Archives' },
  { value: 'other', label: 'Other' },
]

export type ModifiedRange = 'today' | 'last-7-days' | 'last-30-days' | 'this-year' | 'last-year'

export function modifiedFilters(nowMs = Date.now()): { value: ModifiedRange; label: string }[] {
  const year = new Date(nowMs).getFullYear()
  return [
    { value: 'today', label: 'Today' },
    { value: 'last-7-days', label: 'Last 7 days' },
    { value: 'last-30-days', label: 'Last 30 days' },
    { value: 'this-year', label: `This year (${year})` },
    { value: 'last-year', label: `Last year (${year - 1})` },
  ]
}

/** Whether `timeMs` falls in `range`, in local time. Items without a time match no range. */
export function isModifiedIn(timeMs: number | undefined, range: ModifiedRange, nowMs = Date.now()) {
  if (timeMs === undefined) return false
  const now = new Date(nowMs)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  const year = new Date(timeMs).getFullYear()

  switch (range) {
    case 'today':
      return timeMs >= startOfToday
    case 'last-7-days':
      return timeMs >= startOfToday - 6 * dayMs
    case 'last-30-days':
      return timeMs >= startOfToday - 29 * dayMs
    case 'this-year':
      return year === now.getFullYear()
    case 'last-year':
      return year === now.getFullYear() - 1
  }
}
