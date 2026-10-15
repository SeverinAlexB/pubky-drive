import type { Session } from '@synonymdev/pubky'
import { LoaderCircle } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { SHOW_REQUEST_MONITOR } from '../config'

// Loaded only in development, so production bundles contain neither its code nor its styles.
const RequestMonitor = import.meta.env.DEV
  ? lazy(() =>
      import('../dev/RequestMonitor').then((module) => ({ default: module.RequestMonitor })),
    )
  : () => null
import { describeError } from '../drive/errors'
import { SignInPage } from '../features/auth/SignInPage'
import { PublicViewer } from '../features/sharing/PublicViewer'
import {
  onSavedSessionChange,
  replaceSession,
  restoreSavedSession,
  saveSession,
  signOut,
} from '../pubky/auth'
import { SnackbarProvider } from '../ui/Snackbar'
import { DriveApp } from './DriveApp'
import { useRoute } from './routes'

type SessionState =
  | { state: 'restoring' }
  | { state: 'signed-out'; error?: string }
  | { state: 'signed-in'; session: Session }

export function App() {
  const route = useRoute()
  return (
    <SnackbarProvider>
      {route.view === 'viewer' ? <PublicViewer address={route.address} /> : <SessionGate />}
      {SHOW_REQUEST_MONITOR && (
        <Suspense>
          <RequestMonitor />
        </Suspense>
      )}
    </SnackbarProvider>
  )
}

/** Restores the saved session, or shows sign-in until there is one. */
function SessionGate() {
  const [session, setSession] = useState<SessionState>({ state: 'restoring' })

  const restore = useCallback(() => {
    restoreSavedSession().then(
      (restored) =>
        setSession(restored ? { state: 'signed-in', session: restored } : { state: 'signed-out' }),
      (error: unknown) => setSession({ state: 'signed-out', error: describeError(error) }),
    )
  }, [])

  useEffect(() => {
    restore()
    // Another tab signed in, changed access or signed out: follow it, instead of keeping a
    // session that may have been revoked.
    return onSavedSessionChange(restore)
  }, [restore])

  const onSignedIn = useCallback(async (signedIn: Session) => {
    await saveSession(signedIn)
    setSession({ state: 'signed-in', session: signedIn })
  }, [])

  const onReplaceSession = useCallback(
    async (next: Session) => {
      if (session.state !== 'signed-in') return
      await replaceSession(session.session, next)
      setSession({ state: 'signed-in', session: next })
    },
    [session],
  )

  const onSignOut = useCallback(async () => {
    if (session.state !== 'signed-in') return
    await signOut(session.session)
    setSession({ state: 'signed-out' })
  }, [session])

  switch (session.state) {
    case 'restoring':
      return (
        <p className="app-loading">
          <LoaderCircle className="spinner" /> Restoring session…
        </p>
      )
    case 'signed-out':
      return (
        <>
          {session.error && <p className="app-error">{session.error}</p>}
          <SignInPage onSignedIn={onSignedIn} />
        </>
      )
    case 'signed-in':
      return (
        <DriveApp
          session={session.session}
          onReplaceSession={onReplaceSession}
          onSignOut={onSignOut}
        />
      )
  }
}
