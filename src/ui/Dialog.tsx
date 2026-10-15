import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import './Dialog.css'

interface DialogProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  /** Buttons at the bottom right. */
  actions?: ReactNode
  width?: number
  /** Called on submit (Enter in a field, or a submit button). */
  onSubmit?: () => void
}

/** A modal dialog with a dimmed backdrop. Esc and a backdrop click close it. */
export function Dialog({ title, onClose, children, actions, width = 400, onSubmit }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      style={{ width }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onMouseDown={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit?.()
        }}
      >
        <h2 className="dialog-title" id={titleId}>
          {title}
        </h2>
        <div className="dialog-body">{children}</div>
        {actions && <div className="dialog-actions">{actions}</div>}
      </form>
    </dialog>
  )
}

type DialogRenderer = (close: () => void) => ReactNode

interface DialogHost {
  /** Shows the dialog that `render` returns. It receives a function that closes it. */
  openDialog(render: DialogRenderer): void
}

const DialogHostContext = createContext<DialogHost | undefined>(undefined)

/** Hosts the app's open dialogs. A dialog opened from another one, such as a confirmation, stacks on top. */
export function DialogHostProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<{ id: number; render: DialogRenderer }[]>([])
  const nextId = useRef(1)

  const host = useMemo(
    () => ({
      openDialog: (render: DialogRenderer) => {
        const id = nextId.current++
        setStack((current) => [...current, { id, render }])
      },
    }),
    [],
  )
  const close = useCallback(
    (id: number) => setStack((current) => current.filter((dialog) => dialog.id !== id)),
    [],
  )

  return (
    <DialogHostContext.Provider value={host}>
      {children}
      {stack.map((dialog) => (
        <Fragment key={dialog.id}>{dialog.render(() => close(dialog.id))}</Fragment>
      ))}
    </DialogHostContext.Provider>
  )
}

export function useDialogHost() {
  const host = useContext(DialogHostContext)
  if (!host) throw new Error('useDialogHost must be used inside DialogHostProvider')
  return host
}

/** Opens a confirmation dialog and resolves to whether the user confirmed. */
export function useConfirm() {
  const { openDialog } = useDialogHost()

  return useCallback(
    (options: { title: string; message: ReactNode; confirmLabel: string; danger?: boolean }) =>
      new Promise<boolean>((resolve) => {
        openDialog((close) => {
          const finish = (confirmed: boolean) => {
            close()
            resolve(confirmed)
          }
          return (
            <Dialog
              title={options.title}
              onClose={() => finish(false)}
              onSubmit={() => finish(true)}
              actions={
                <>
                  <button
                    type="button"
                    className="button button-text"
                    onClick={() => finish(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`button ${options.danger ? 'button-danger' : 'button-filled'}`}
                    autoFocus
                  >
                    {options.confirmLabel}
                  </button>
                </>
              }
            >
              <p className="dialog-message">{options.message}</p>
            </Dialog>
          )
        })
      }),
    [openDialog],
  )
}
