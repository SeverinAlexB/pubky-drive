import type { Session } from '@synonymdev/pubky'
import { HardDrive } from 'lucide-react'
import { useState } from 'react'
import { DEVELOPMENT_SIGNUP_HOMESERVER, SHOW_DEVELOPMENT_SIGNUP } from '../../config'
import { describeError } from '../../drive/errors'
import { signupDevelopmentUser } from '../../pubky/auth'
import { RingAuthorization } from './RingAuthorization'
import './SignInPage.css'

/** Sign-in with Pubky Ring, for the Drive folder only. See docs/spec/11-sign-in.md. */
export function SignInPage({ onSignedIn }: { onSignedIn: (session: Session) => Promise<void> }) {
  return (
    <main className="signin">
      <header className="signin-header">
        <HardDrive size={40} color="#0b57d0" aria-hidden />
        <h1>Pubky Drive</h1>
        <p>Your files, on your homeserver.</p>
      </header>

      <section className="signin-card">
        <h2>Sign in with Pubky Ring</h2>
        <p className="muted signin-scope">
          Pubky Drive asks only for its own folder, <code>/pub/pubky-drive/</code> and{' '}
          <code>/priv/pubky-drive/</code>. Other apps’ data stays untouched. You can give access to
          the rest of your homeserver later, in the Homeserver section.
        </p>
        <RingAuthorization request="drive" onApproved={onSignedIn} />
      </section>

      {SHOW_DEVELOPMENT_SIGNUP && <DevelopmentSignup onSignedIn={onSignedIn} />}
    </main>
  )
}

/** Testnet development shortcut: create an identity and approve the sign-in in one step. */
function DevelopmentSignup({ onSignedIn }: { onSignedIn: (session: Session) => Promise<void> }) {
  const [homeserver, setHomeserver] = useState(DEVELOPMENT_SIGNUP_HOMESERVER)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await onSignedIn(await signupDevelopmentUser(homeserver))
    } catch (caught) {
      setError(describeError(caught))
      setBusy(false)
    }
  }

  return (
    <section className="signin-card">
      <h2>New identity</h2>
      <p className="muted">
        Development only: creates a keypair, signs up on the testnet homeserver and signs in.
        Requires <code>signup_mode = "open"</code>. Until you reload, this identity can also approve
        homeserver access.
      </p>
      <form
        className="signin-dev-form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <input
          className="text-field"
          aria-label="Homeserver public key"
          value={homeserver}
          onChange={(event) => setHomeserver(event.target.value)}
        />
        <button type="submit" className="button button-filled" disabled={busy}>
          {busy ? 'Creating…' : 'Create identity and sign in'}
        </button>
      </form>
      {error && <p className="field-error">{error}</p>}
    </section>
  )
}
