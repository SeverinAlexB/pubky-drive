import type { Session } from '@synonymdev/pubky'
import { LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { describeError } from '../drive/errors'
import { SignInPage } from '../features/auth/SignInPage'
import { PublicViewer } from '../features/sharing/PublicViewer'
import { restoreSavedSession, saveSession, signOut } from '../pubky/auth'
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
    </SnackbarProvider>
  )
}

/** Restores the saved session, or shows sign-in until there is one. */
function SessionGate() {
  const [session, setSession] = useState<SessionState>({ state: 'restoring' })

  useEffect(() => {
    restoreSavedSession().then(
      (restored) =>
        setSession(restored ? { state: 'signed-in', session: restored } : { state: 'signed-out' }),
      (error: unknown) => setSession({ state: 'signed-out', error: describeError(error) }),
    )
  }, [])

  const onSignedIn = useCallback(async (signedIn: Session) => {
    await saveSession(signedIn)
    setSession({ state: 'signed-in', session: signedIn })
  }, [])

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
      return <DriveApp session={session.session} onSignOut={onSignOut} />
  }
}
