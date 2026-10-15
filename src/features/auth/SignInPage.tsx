import type { Session } from '@synonymdev/pubky'
import { HardDrive, LoaderCircle, RefreshCw } from 'lucide-react'
import { toCanvas } from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import { DEVELOPMENT_SIGNUP_HOMESERVER, SHOW_DEVELOPMENT_SIGNUP } from '../../config'
import type { AccessMode } from '../../drive/access'
import { describeError } from '../../drive/errors'
import {
  isRingAuthCanceled,
  isRingAuthExpired,
  signupDevelopmentUser,
  startRingAuthFlow,
  type RingAuthFlow,
} from '../../pubky/auth'
import { copyText } from '../sharing/clipboard'
import './SignInPage.css'

type LinkState =
  | { state: 'loading' }
  | { state: 'ready'; authorizationUrl: string }
  | { state: 'expired' }
  | { state: 'failed'; error: string }

const QR_SIZE = 220

/** Sign-in with Pubky Ring and the access choice. See docs/spec/11-sign-in.md. */
export function SignInPage({ onSignedIn }: { onSignedIn: (session: Session) => Promise<void> }) {
  const [mode, setMode] = useState<AccessMode>('drive-folder')
  const [attempt, setAttempt] = useState(0)
  // Each mode and attempt gets its own link; until it exists, the link is loading.
  const flowKey = `${mode}:${attempt}`
  const [linkFor, setLinkFor] = useState<{ key: string; link: LinkState }>()
  const link: LinkState = linkFor?.key === flowKey ? linkFor.link : { state: 'loading' }
  const [copied, setCopied] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    let flow: RingAuthFlow | undefined
    let active = true
    const setLink = (next: LinkState) => setLinkFor({ key: `${mode}:${attempt}`, link: next })

    startRingAuthFlow(mode).then(
      (started) => {
        if (!active) {
          started.cancel()
          return
        }
        flow = started
        setLink({ state: 'ready', authorizationUrl: started.authorizationUrl })
        started.awaitApproval.then(
          async (session) => {
            if (!active) return
            setCompleting(true)
            await onSignedIn(session)
          },
          (error: unknown) => {
            if (!active || isRingAuthCanceled(error)) return
            setLink(
              isRingAuthExpired(error)
                ? { state: 'expired' }
                : { state: 'failed', error: describeError(error) },
            )
          },
        )
      },
      (error: unknown) => active && setLink({ state: 'failed', error: describeError(error) }),
    )

    return () => {
      active = false
      flow?.cancel()
    }
  }, [mode, attempt, onSignedIn])

  const copyLink = async () => {
    if (link.state !== 'ready') return
    await copyText(link.authorizationUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <main className="signin">
      <header className="signin-header">
        <HardDrive size={40} color="#0b57d0" aria-hidden />
        <h1>Pubky Drive</h1>
        <p>Your files, on your homeserver.</p>
      </header>

      <section className="signin-card">
        <h2>What Pubky Drive can access</h2>
        <div className="signin-modes" role="radiogroup" aria-label="What Pubky Drive can access">
          <ModeOption
            mode="drive-folder"
            selected={mode}
            onSelect={setMode}
            title="Drive folder"
            description="Only files that Pubky Drive stores. Other apps’ data stays untouched."
          />
          <ModeOption
            mode="entire-homeserver"
            selected={mode}
            onSelect={setMode}
            title="Entire homeserver"
            description="Browse and change every file in your public and private storage, including other apps’ data. Changing it can break those apps."
          />
        </div>

        <h2>Sign in with Pubky Ring</h2>
        <div className="signin-ring">
          <div className="signin-qr">
            {completing ? (
              <span className="signin-qr-placeholder">
                <LoaderCircle className="spinner" /> Signing in…
              </span>
            ) : (
              <QrCode link={link} />
            )}
          </div>
          <div className="signin-actions">
            <p className="muted">Scan the code with Pubky Ring, or open the link on this device.</p>
            <a
              className="button button-filled"
              href={link.state === 'ready' ? link.authorizationUrl : undefined}
              aria-disabled={link.state !== 'ready'}
            >
              Authorize with Pubky Ring
            </a>
            <button
              type="button"
              className="button button-outlined"
              disabled={link.state !== 'ready'}
              onClick={copyLink}
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              className="button button-text"
              onClick={() => setAttempt(attempt + 1)}
            >
              <RefreshCw size={16} /> {link.state === 'expired' ? 'New link' : 'Refresh link'}
            </button>
          </div>
        </div>
        {link.state === 'failed' && <p className="field-error">{link.error}</p>}
      </section>

      {SHOW_DEVELOPMENT_SIGNUP && <DevelopmentSignup mode={mode} onSignedIn={onSignedIn} />}
    </main>
  )
}

function ModeOption(props: {
  mode: AccessMode
  selected: AccessMode
  onSelect: (mode: AccessMode) => void
  title: string
  description: string
}) {
  return (
    <label className={`signin-mode ${props.selected === props.mode ? 'selected' : ''}`}>
      <input
        type="radio"
        name="access-mode"
        checked={props.selected === props.mode}
        onChange={() => props.onSelect(props.mode)}
      />
      <span>
        <strong>{props.title}</strong>
        <span className="muted">{props.description}</span>
      </span>
    </label>
  )
}

function QrCode({ link }: { link: LinkState }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (link.state !== 'ready' || !canvas.current) return
    toCanvas(canvas.current, link.authorizationUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: QR_SIZE,
    }).catch((error: unknown) => console.error('Could not draw the sign-in QR code', error))
  }, [link])

  if (link.state === 'loading') {
    return (
      <span className="signin-qr-placeholder">
        <LoaderCircle className="spinner" /> Creating link…
      </span>
    )
  }
  if (link.state === 'expired') {
    return (
      <span className="signin-qr-placeholder">
        <strong>Link expired</strong> Create a new one.
      </span>
    )
  }
  if (link.state === 'failed') return <span className="signin-qr-placeholder">No link</span>
  return (
    <canvas ref={canvas} width={QR_SIZE} height={QR_SIZE} aria-label="Pubky Ring sign-in QR code" />
  )
}

/** Testnet development shortcut: create an identity and approve the request in one step. */
function DevelopmentSignup({
  mode,
  onSignedIn,
}: {
  mode: AccessMode
  onSignedIn: (session: Session) => Promise<void>
}) {
  const [homeserver, setHomeserver] = useState(DEVELOPMENT_SIGNUP_HOMESERVER)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await onSignedIn(await signupDevelopmentUser(homeserver, mode))
    } catch (caught) {
      setError(describeError(caught))
      setBusy(false)
    }
  }

  return (
    <section className="signin-card">
      <h2>New identity</h2>
      <p className="muted">
        Development only: creates a keypair, signs up on the testnet homeserver and signs in with
        the access chosen above. Requires <code>signup_mode = "open"</code>.
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
