import type { Session } from '@synonymdev/pubky'
import { Eye, FolderLock, PencilLine } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useDrive } from '../../app/DriveContext'
import { accessFromCapabilities, homeserverLevel, type AccessRequest } from '../../drive/access'
import { hasDevelopmentIdentity } from '../../pubky/auth'
import { Dialog, useDialogHost } from '../../ui/Dialog'
import { useNotifier } from '../../ui/Snackbar'
import { RingAuthorization } from '../auth/RingAuthorization'
import './AccessDialog.css'

const OPTIONS: { request: AccessRequest; title: string; description: string; icon: typeof Eye }[] =
  [
    {
      request: 'drive',
      title: 'Drive folder only',
      description: 'Pubky Drive sees only its own files. Other apps’ data stays untouched.',
      icon: FolderLock,
    },
    {
      request: 'view',
      title: 'View all files',
      description:
        'Browse, preview and download every file on your homeserver, without changing anything outside Pubky Drive.',
      icon: Eye,
    },
    {
      request: 'manage',
      title: 'Manage all files',
      description:
        'Also rename, move and delete any file, including other apps’ data. Changing that data can break those apps.',
      icon: PencilLine,
    },
  ]

/** The access level of the current session, as one of the dialog's options. */
export function useCurrentAccessRequest(): AccessRequest {
  const { access } = useDrive()
  return homeserverLevel(access) ?? 'drive'
}

/** Opens the dialog for changing what Pubky Drive may access. */
export function useAccessDialog() {
  const { openDialog } = useDialogHost()
  return useCallback(
    (suggested?: AccessRequest) =>
      openDialog((close) => <AccessDialog suggested={suggested} onClose={close} />),
    [openDialog],
  )
}

/** Chooses an access level, then asks Pubky Ring to approve it. See docs/spec/11-sign-in.md. */
function AccessDialog({ suggested, onClose }: { suggested?: AccessRequest; onClose: () => void }) {
  const { ownerZ32, replaceSession } = useDrive()
  const { notify } = useNotifier()
  const current = useCurrentAccessRequest()
  const [choice, setChoice] = useState<AccessRequest>(suggested ?? current)
  const [authorizing, setAuthorizing] = useState(false)

  const onApproved = useCallback(
    async (session: Session) => {
      await replaceSession(session)
      onClose()
      const granted = homeserverLevel(accessFromCapabilities(session.info.capabilities)) ?? 'drive'
      notify(
        granted === choice
          ? `Access changed: ${OPTIONS.find((option) => option.request === granted)!.title}`
          : 'Pubky Ring approved less access than requested.',
      )
    },
    [replaceSession, onClose, notify, choice],
  )

  return (
    <Dialog
      title="What Pubky Drive can access"
      width={600}
      onClose={onClose}
      onSubmit={() => setAuthorizing(true)}
      actions={
        authorizing ? (
          <button
            type="button"
            className="button button-text"
            onClick={() => setAuthorizing(false)}
          >
            Back
          </button>
        ) : (
          <>
            <button type="button" className="button button-text" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button-filled" disabled={choice === current}>
              Continue with Pubky Ring
            </button>
          </>
        )
      }
    >
      {authorizing ? (
        <>
          <p className="dialog-message">
            Approve “{OPTIONS.find((option) => option.request === choice)!.title}” in Pubky Ring
            with the identity you’re signed in with. Pubky Drive then replaces your current session.
          </p>
          <RingAuthorization
            request={choice}
            onApproved={onApproved}
            developmentApproval={hasDevelopmentIdentity(ownerZ32)}
          />
        </>
      ) : (
        <div className="access-options" role="radiogroup" aria-label="Access level">
          {OPTIONS.map(({ request, title, description, icon: Icon }) => (
            <label
              key={request}
              className={`access-option ${choice === request ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="access-level"
                checked={choice === request}
                onChange={() => setChoice(request)}
              />
              <Icon size={22} className="access-option-icon" aria-hidden />
              <span>
                <strong>
                  {title}
                  {request === current && <span className="access-current"> (current)</span>}
                </strong>
                <span className="muted">{description}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </Dialog>
  )
}
