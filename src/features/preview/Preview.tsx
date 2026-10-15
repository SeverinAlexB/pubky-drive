import {
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
  Maximize,
  UserPlus,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FILE_TYPE_LABELS, fileTypeOf, type DriveItem } from '../../drive/items'
import { FileIcon } from '../../ui/FileIcon'
import { formatSize } from '../browse/format'
import { useFileContent, type LoadBytes } from './useFileContent'
import './Preview.css'

interface PreviewProps {
  /** The files that ← and → move through, in list order. */
  files: DriveItem[]
  index: number
  loadBytes: LoadBytes
  onNavigate: (index: number) => void
  onClose: () => void
  onDownload: (item: DriveItem) => void
  onShare?: (item: DriveItem) => void
}

/** Full-window file preview. See docs/spec/08-preview-and-details.md. */
export function Preview({
  files,
  index,
  loadBytes,
  onNavigate,
  onClose,
  onDownload,
  onShare,
}: PreviewProps) {
  const item = files[index]
  const content = useFileContent(item, loadBytes)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowLeft' && index > 0) onNavigate(index - 1)
      else if (event.key === 'ArrowRight' && index < files.length - 1) onNavigate(index + 1)
      else return
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [index, files.length, onNavigate, onClose])

  if (!item) return null

  return createPortal(
    <div className="preview" role="dialog" aria-modal="true" aria-label={`Preview of ${item.name}`}>
      <header className="preview-bar">
        <button
          type="button"
          className="preview-icon-button"
          aria-label="Close preview"
          onClick={onClose}
          autoFocus
        >
          <X size={22} />
        </button>
        <FileIcon item={item} size={22} />
        <h2 className="preview-title">{item.name}</h2>
        <button type="button" className="preview-button" onClick={() => onDownload(item)}>
          <Download size={18} /> Download
        </button>
        {onShare && (
          <button type="button" className="preview-button" onClick={() => onShare(item)}>
            <UserPlus size={18} /> Share
          </button>
        )}
      </header>

      <div
        className="preview-stage"
        onClick={(event) => event.target === event.currentTarget && onClose()}
      >
        {content.state === 'loading' && (
          <LoaderCircle className="spinner" size={40} color="#fff" aria-label="Loading" />
        )}
        {content.state === 'failed' && <p className="preview-message">{content.error}</p>}
        {content.state === 'unsupported' && (
          <div className="preview-message">
            <FileIcon item={item} size={64} />
            <p>No preview available</p>
            <p className="preview-meta">
              {FILE_TYPE_LABELS[fileTypeOf(item)]} · {formatSize(item.sizeBytes)}
            </p>
            <button type="button" className="button button-filled" onClick={() => onDownload(item)}>
              Download
            </button>
          </div>
        )}
        {content.state === 'text' && (
          <div className="preview-page">
            <pre>{content.text}</pre>
            {content.truncated && <p className="preview-note">Showing the first 1 MB.</p>}
          </div>
        )}
        {content.state === 'url' && content.type === 'image' && (
          <img
            src={content.url}
            alt={item.name}
            className="preview-image"
            style={{ transform: `scale(${zoom})` }}
          />
        )}
        {content.state === 'url' && content.type === 'pdf' && (
          <iframe src={content.url} title={item.name} className="preview-pdf" />
        )}
        {content.state === 'url' && content.type === 'audio' && (
          <audio src={content.url} controls autoPlay={false} />
        )}
        {content.state === 'url' && content.type === 'video' && (
          <video src={content.url} controls className="preview-video" />
        )}
      </div>

      {content.state === 'url' && content.type === 'image' && (
        <div className="preview-zoom" role="toolbar" aria-label="Zoom">
          <button
            type="button"
            className="preview-icon-button"
            aria-label="Zoom out"
            onClick={() => setZoom(Math.max(0.25, zoom / 1.25))}
          >
            <ZoomOut size={20} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="preview-icon-button"
            aria-label="Zoom in"
            onClick={() => setZoom(Math.min(8, zoom * 1.25))}
          >
            <ZoomIn size={20} />
          </button>
          <button
            type="button"
            className="preview-icon-button"
            aria-label="Fit to window"
            onClick={() => setZoom(1)}
          >
            <Maximize size={18} />
          </button>
        </div>
      )}

      {index > 0 && (
        <button
          type="button"
          className="preview-nav previous"
          aria-label="Previous file"
          onClick={() => onNavigate(index - 1)}
        >
          <ChevronLeft size={28} />
        </button>
      )}
      {index < files.length - 1 && (
        <button
          type="button"
          className="preview-nav next"
          aria-label="Next file"
          onClick={() => onNavigate(index + 1)}
        >
          <ChevronRight size={28} />
        </button>
      )}
    </div>,
    document.body,
  )
}
