import { X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import './Snackbar.css'

export interface SnackbarAction {
  label: string
  run: () => void
}

interface SnackbarMessage {
  id: number
  text: string
  action?: SnackbarAction
  /** Persistent messages stay until replaced, for operations in progress. */
  persistent?: boolean
}

interface Notifier {
  /** Shows a message, replacing the current one. Returns an ID for `dismiss`. */
  notify(text: string, options?: { action?: SnackbarAction; persistent?: boolean }): number
  dismiss(id: number): void
}

const HIDE_AFTER_MS = 6000
const NotifierContext = createContext<Notifier | undefined>(undefined)

/** Shows one message at a time at the bottom left, as a dark snackbar. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<SnackbarMessage>()
  const nextId = useRef(1)

  const notify = useCallback<Notifier['notify']>((text, options = {}) => {
    const id = nextId.current++
    setMessage({ id, text, ...options })
    return id
  }, [])

  const dismiss = useCallback((id: number) => {
    setMessage((current) => (current?.id === id ? undefined : current))
  }, [])

  useEffect(() => {
    if (!message || message.persistent) return
    const timer = setTimeout(() => dismiss(message.id), HIDE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [message, dismiss])

  const notifier = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <NotifierContext.Provider value={notifier}>
      {children}
      <div className="snackbar-region" role="status" aria-live="polite">
        {message && (
          <div className="snackbar" key={message.id}>
            <span className="snackbar-text">{message.text}</span>
            {message.action && (
              <button
                type="button"
                className="snackbar-action"
                onClick={() => {
                  dismiss(message.id)
                  message.action?.run()
                }}
              >
                {message.action.label}
              </button>
            )}
            <button
              type="button"
              className="snackbar-close"
              aria-label="Dismiss"
              onClick={() => dismiss(message.id)}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </NotifierContext.Provider>
  )
}

export function useNotifier() {
  const notifier = useContext(NotifierContext)
  if (!notifier) throw new Error('useNotifier must be used inside SnackbarProvider')
  return notifier
}
