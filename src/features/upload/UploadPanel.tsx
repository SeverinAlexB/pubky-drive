import { ChevronDown, CircleAlert, CircleCheck, LoaderCircle, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { FileIcon } from '../../ui/FileIcon'
import type { UploadRow } from './UploadsProvider'
import './UploadPanel.css'

interface UploadPanelProps {
  rows: UploadRow[]
  onCancel: () => void
  onRetry: (id: number) => void
  onClose: () => void
}

export function UploadPanel({ rows, onCancel, onRetry, onClose }: UploadPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const count = (status: UploadRow['status']) => rows.filter((row) => row.status === status).length
  const remaining = count('queued') + count('uploading')
  const failed = count('failed')

  let title: string
  if (remaining > 0) title = `Uploading ${rows.length} ${rows.length === 1 ? 'item' : 'items'}`
  else if (failed > 0) title = `${failed} ${failed === 1 ? 'upload' : 'uploads'} failed`
  else title = `${count('done')} ${count('done') === 1 ? 'upload' : 'uploads'} complete`

  return (
    <section className="upload-panel" aria-label="Uploads">
      <header className="upload-panel-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button small"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronDown size={20} style={{ transform: collapsed ? 'rotate(180deg)' : undefined }} />
        </button>
        <button type="button" className="icon-button small" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {!collapsed && (
        <>
          {remaining > 0 && (
            <div className="upload-panel-status">
              <span>{count('uploading') === 0 ? 'Starting uploads…' : `${remaining} left`}</span>
              <button type="button" className="button button-text" onClick={onCancel}>
                Cancel
              </button>
            </div>
          )}
          <ul className="upload-panel-rows">
            {rows.map((row) => (
              <li key={row.id}>
                <FileIcon item={{ kind: 'file', name: row.name }} />
                <span className="upload-panel-name" title={row.upload.target}>
                  {row.name}
                </span>
                <UploadStatusIcon row={row} onRetry={onRetry} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function UploadStatusIcon({ row, onRetry }: { row: UploadRow; onRetry: (id: number) => void }) {
  switch (row.status) {
    case 'queued':
      return <span className="upload-queued" aria-label="Waiting" />
    case 'uploading':
      return (
        <LoaderCircle size={20} className="spinner" color="var(--accent)" aria-label="Uploading" />
      )
    case 'done':
      return <CircleCheck size={22} color="#fff" fill="var(--success)" aria-label="Uploaded" />
    case 'canceled':
      return <span className="muted">Canceled</span>
    case 'failed':
      return (
        <span className="upload-failed">
          <CircleAlert size={20} color="var(--danger)" aria-label={`Failed: ${row.error}`}>
            <title>{row.error}</title>
          </CircleAlert>
          <button
            type="button"
            className="icon-button small"
            aria-label={`Retry ${row.name}`}
            onClick={() => onRetry(row.id)}
          >
            <RotateCcw size={18} />
          </button>
        </span>
      )
  }
}
