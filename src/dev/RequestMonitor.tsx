import { Activity, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  resetRequestCounts,
  subscribeToRequestCounts,
  type RequestCounts,
  type RequestKind,
} from './requestCounts'
import './RequestMonitor.css'

const KINDS: RequestKind[] = [
  'event stream',
  'list',
  'read',
  'metadata',
  'write',
  'delete',
  'session',
  'auth relay',
  'other',
]

/** Development only: a small panel with request counts. Click the pill to expand it. */
export function RequestMonitor() {
  const [counts, setCounts] = useState<RequestCounts>()
  const [open, setOpen] = useState(false)
  useEffect(() => subscribeToRequestCounts(setCounts), [])
  if (!counts) return null

  const rateLimited = Object.values(counts.rateLimited).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  )

  return (
    <aside
      className={`request-monitor ${rateLimited > 0 ? 'limited' : ''}`}
      aria-label="Request monitor (development)"
    >
      <button
        type="button"
        className="request-monitor-pill"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Activity size={14} aria-hidden /> {counts.total} requests · {rateLimited} × 429
      </button>
      {open && (
        <div className="request-monitor-panel">
          <table>
            <thead>
              <tr>
                <th>Kind</th>
                <th>Sent</th>
                <th>429</th>
              </tr>
            </thead>
            <tbody>
              {KINDS.filter((kind) => counts.byKind[kind]).map((kind) => (
                <tr key={kind}>
                  <td>{kind}</td>
                  <td>{counts.byKind[kind]}</td>
                  <td>{counts.rateLimited[kind] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {counts.lastRateLimited && <p>Last 429: {counts.lastRateLimited}</p>}
          <div className="request-monitor-actions">
            <button type="button" className="button button-text" onClick={resetRequestCounts}>
              Reset
            </button>
            <button
              type="button"
              className="icon-button small"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
