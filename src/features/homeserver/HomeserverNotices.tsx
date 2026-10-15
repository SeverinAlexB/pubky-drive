import { Eye, PencilLine, ServerCog, TriangleAlert } from 'lucide-react'
import { useDrive } from '../../app/DriveContext'
import { homeserverLevel } from '../../drive/access'
import { useAccessDialog } from '../access/AccessDialog'
import './HomeserverNotices.css'

/** The warning above every Homeserver listing. */
export function HomeserverBanner() {
  const { access } = useDrive()
  const openAccessDialog = useAccessDialog()
  const level = homeserverLevel(access)

  return (
    <div className="homeserver-banner" role="note">
      <TriangleAlert size={20} aria-hidden />
      <p>
        You’re browsing all files on your homeserver. Files outside Pubky Drive belong to other
        apps; changing them can break those apps.{' '}
        {level === 'view' && (
          <strong>View only: you can open and download files, but not change them.</strong>
        )}
      </p>
      {level === 'view' && (
        <button
          type="button"
          className="button button-text"
          onClick={() => openAccessDialog('manage')}
        >
          Allow changes
        </button>
      )}
    </div>
  )
}

/** The second warning inside Pubky Drive's own folders, where the bin and settings are. */
export function AppFolderBanner() {
  return (
    <div className="homeserver-banner" role="note">
      <TriangleAlert size={20} aria-hidden />
      <p>
        Pubky Drive manages this folder. Changing <code>bin/</code> or <code>app/</code> can break
        the bin and starred items; changing <code>files/</code> here is the same as in My Drive.
      </p>
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
