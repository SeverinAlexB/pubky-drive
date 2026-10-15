import { useCallback, useMemo } from 'react'
import { useConfirm } from '../../ui/Dialog'
import { useActionHistory } from '../actions/ActionHistoryProvider'
import { changedApps, type Change, type ChangedApp } from './changedApps'

/**
 * Asks before the first change to another app's files, once per app folder until sign-out. See
 * docs/spec/02-navigation.md, "Changing other apps' files".
 */
export function useConfirmHomeserverChange() {
  const { confirmedApps } = useActionHistory()
  const confirm = useConfirm()

  /** Resolves to whether the change may go ahead; asks when it touches an app not confirmed yet. */
  const confirmChange = useCallback(
    async (change: Change) => {
      const unconfirmed = changedApps(change).filter((app) => !confirmedApps.has(app.folder))
      if (unconfirmed.length === 0) return true
      if (!(await confirm({ ...changeWarning(unconfirmed), confirmLabel: 'Continue' })))
        return false
      for (const app of unconfirmed) confirmedApps.add(app.folder)
      return true
    },
    [confirm, confirmedApps],
  )

  /** Records that the user already agreed to changing these paths in another dialog. */
  const remember = useCallback(
    (change: Change) => {
      for (const app of changedApps(change)) confirmedApps.add(app.folder)
    },
    [confirmedApps],
  )

  return useMemo(() => ({ confirmChange, remember }), [confirmChange, remember])
}

function changeWarning(apps: ChangedApp[]): { title: string; message: string } {
  const noAgain = (them: string) => `Pubky Drive won’t ask again for ${them} until you sign out.`
  if (apps.length > 1) {
    const names = apps.map((app) => app.name).join(', ')
    return {
      title: 'Change other apps’ files?',
      message: `This changes files of ${names}. Changing them by hand can break those apps. ${noAgain('them')}`,
    }
  }

  const [app] = apps
  if (app.ownData) {
    return {
      title: 'Change Pubky Drive’s own data?',
      message: `This is Pubky Drive’s bin, settings or Drive folder, not a file of yours. Changing it by hand can break the bin and starred items. ${noAgain('it')}`,
    }
  }
  if (app.name.startsWith('/')) {
    return {
      title: `Change files at the top of ${app.name}?`,
      message: `Files directly in ${app.name} belong to no app folder, but apps may rely on them. ${noAgain(app.name)}`,
    }
  }
  return {
    title: `Change ${app.name}’s files?`,
    message: `These files belong to ${app.name}. Renaming, moving or deleting them can break that app. ${noAgain(app.name)}`,
  }
}
