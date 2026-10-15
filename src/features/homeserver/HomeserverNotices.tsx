import { Eye, PencilLine, ServerCog } from 'lucide-react'
import { useDrive } from '../../app/DriveContext'
import { homeserverLevel } from '../../drive/access'
import { useAccessDialog } from '../access/AccessDialog'
import './HomeserverNotices.css'

/**
 * With View access, a quiet note above Homeserver listings, with a way to allow changes. With
 * Manage access there is none: the first change to another app's files asks instead.
 */
export function HomeserverAccessNote() {
  const { access } = useDrive()
  const openAccessDialog = useAccessDialog()
  if (homeserverLevel(access) !== 'view') return null

  return (
    <div className="homeserver-note" role="note">
      <Eye size={18} aria-hidden />
      <p>View only: you can open and download these files, but not change them.</p>
      <button
        type="button"
        className="button button-text"
        onClick={() => openAccessDialog('manage')}
      >
        Allow changes
      </button>
    </div>
  )
}

/** Shown in the Homeserver section until the session has homeserver access. */
export function HomeserverLocked() {
  const openAccessDialog = useAccessDialog()

  return (
    <div className="homeserver-locked">
      <ServerCog size={48} aria-hidden />
      <h2>Browse your whole homeserver</h2>
      <p>
        Pubky Drive can currently access only its own folder. To see the files that other apps store
        on your homeserver, such as your pubky.app profile and posts, give Pubky Drive access with
        Pubky Ring.
      </p>
      <div className="homeserver-locked-choices">
        <button
          type="button"
          className="button button-filled"
          onClick={() => openAccessDialog('view')}
        >
          <Eye size={18} /> View all files
        </button>
        <button
          type="button"
          className="button button-outlined"
          onClick={() => openAccessDialog('manage')}
        >
          <PencilLine size={18} /> Manage all files
        </button>
      </div>
      <p className="homeserver-locked-note">
        View all files is read-only. Manage all files can also change and delete other apps’ data.
        You can return to Drive-folder access at any time from the account menu.
      </p>
    </div>
  )
}
