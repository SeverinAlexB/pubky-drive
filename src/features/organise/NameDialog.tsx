import { useEffect, useRef, useState } from 'react'
import { describeError } from '../../drive/errors'
import { nameProblem, splitExtension } from '../../drive/names'
import { Dialog } from '../../ui/Dialog'

interface NameDialogProps {
  title: string
  initialName: string
  kind: 'file' | 'folder'
  confirmLabel: string
  /** Closes without calling `onConfirm` when the name wasn't changed, as renaming does. */
  closeWhenUnchanged?: boolean
  /** Applies the name. A rejection is shown under the field and keeps the dialog open. */
  onConfirm: (name: string) => Promise<void>
  onClose: () => void
}

/** Asks for a file or folder name, for New folder and Rename. */
export function NameDialog({
  title,
  initialName,
  kind,
  confirmLabel,
  closeWhenUnchanged = false,
  onConfirm,
  onClose,
}: NameDialogProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const problem = nameProblem(name)

  useEffect(() => {
    // Select the name without its extension, so typing keeps the file type.
    const field = input.current
    if (!field) return
    field.focus()
    field.setSelectionRange(0, splitExtension(initialName, kind).base.length)
  }, [initialName, kind])

  const submit = async () => {
    if (problem || busy) return
    if (closeWhenUnchanged && name === initialName) {
      onClose()
      return
    }
    setBusy(true)
    try {
      await onConfirm(name)
      onClose()
    } catch (caught) {
      setError(describeError(caught))
      setBusy(false)
    }
  }

  return (
    <Dialog
      title={title}
      onClose={onClose}
      onSubmit={submit}
      actions={
        <>
          <button type="button" className="button button-text" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-text" disabled={Boolean(problem) || busy}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <input
        ref={input}
        className="text-field"
        aria-label="Name"
        value={name}
        onChange={(event) => {
          setName(event.target.value)
          setError(undefined)
        }}
        aria-invalid={Boolean(problem || error)}
      />
      {(error || (problem && name !== '')) && <p className="field-error">{error ?? problem}</p>}
    </Dialog>
  )
}
