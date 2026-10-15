import { Copy, Globe, Link, Lock } from 'lucide-react'
import { useState } from 'react'
import { useDrive } from '../../app/DriveContext'
import { matchingFolderInOtherArea } from '../../app/locations'
import { canWrite } from '../../drive/access'
import { describeError } from '../../drive/errors'
import type { DriveItem } from '../../drive/items'
import type { Area } from '../../drive/paths'
import { Avatar } from '../../ui/Avatar'
import { Dialog } from '../../ui/Dialog'
import { shortKey } from '../browse/format'
import { copyText } from './clipboard'
import { pubkyAddress, viewerLink } from './links'
import './ShareDialog.css'

interface ShareDialogProps {
  item: DriveItem
  /** Moves the item to the other area after confirmation. Resolves to false when canceled. */
  onChangeArea: (item: DriveItem, area: Area) => Promise<boolean>
  onCopied: (what: string) => void
  onClose: () => void
}

/** "General access" for one item: Private or Public. See docs/spec/09-sharing.md. */
export function ShareDialog({ item, onChangeArea, onCopied, onClose }: ShareDialogProps) {
  const { ownerZ32, access } = useDrive()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const isPublic = item.area === 'public'
  const canChange =
    canWrite(access, item.path) && canWrite(access, matchingFolderInOtherArea(item.path))

  const changeArea = async (area: Area) => {
    if (area === item.area || busy) return
    setBusy(true)
    try {
      if (await onChangeArea(item, area)) onClose()
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text: string, what: string) => {
    try {
      await copyText(text)
      onCopied(what)
    } catch (caught) {
      setError(describeError(caught))
    }
  }

  return (
    <Dialog
      width={512}
      title={`Share ‘${item.name}’`}
      onClose={onClose}
      onSubmit={onClose}
      actions={
        <div className="share-actions">
          <button
            type="button"
            className="button button-outlined"
            disabled={!isPublic}
            title={isPublic ? undefined : 'Make it public to get a link'}
            onClick={() => copy(viewerLink(ownerZ32, item.path), 'Link')}
          >
            <Link size={18} /> Copy link
          </button>
          <button type="submit" className="button button-filled">
            Done
          </button>
        </div>
      }
    >
      <h3 className="share-heading">People with access</h3>
      <div className="share-person">
        <Avatar publicKey={ownerZ32} size={32} />
        <div>
          <div>{shortKey(ownerZ32)} (you)</div>
        </div>
        <span className="muted">Owner</span>
      </div>

      <h3 className="share-heading">General access</h3>
      <div className="share-access" role="radiogroup" aria-label="General access">
        <AccessOption
          area="private"
          checked={!isPublic}
          disabled={busy || (isPublic && !canChange)}
          onChoose={changeArea}
        />
        <AccessOption
          area="public"
          checked={isPublic}
          disabled={busy || (!isPublic && !canChange)}
          onChoose={changeArea}
        />
      </div>
      <p className="share-note">
        Private isn’t encrypted. Your homeserver operator can read it. Homeservers can’t share files
        with specific people.
      </p>

      {isPublic && (
        <div className="share-address">
          <span className="muted">Pubky address</span>
          <code>{pubkyAddress(ownerZ32, item.path)}</code>
          <button
            type="button"
            className="icon-button small"
            aria-label="Copy Pubky address"
            onClick={() => copy(pubkyAddress(ownerZ32, item.path), 'Pubky address')}
          >
            <Copy size={18} />
          </button>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </Dialog>
  )
}

function AccessOption(props: {
  area: Area
  checked: boolean
  disabled: boolean
  onChoose: (area: Area) => void
}) {
  const isPublic = props.area === 'public'
  const Icon = isPublic ? Globe : Lock
  return (
    <label className="share-option" aria-disabled={props.disabled && !props.checked}>
      <input
        type="radio"
        name="general-access"
        checked={props.checked}
        disabled={props.disabled && !props.checked}
        onChange={() => props.onChoose(props.area)}
      />
      <span className={`share-option-icon ${props.checked && isPublic ? 'public' : ''}`}>
        <Icon size={20} />
      </span>
      <span>
        <strong>{isPublic ? 'Public' : 'Private'}</strong>
        <span className="muted">
          {isPublic
            ? 'Anyone with the link can open it.'
            : 'Only you and apps you authorize can open it.'}
        </span>
      </span>
    </label>
  )
}
