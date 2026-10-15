import type { Session } from '@synonymdev/pubky'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import { toCanvas } from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import type { AccessRequest } from '../../drive/access'
import { describeError } from '../../drive/errors'
import {
  approveWithDevelopmentIdentity,
  isRingAuthCanceled,
  isRingAuthExpired,
  startRingAuthFlow,
  type RingAuthFlow,
} from '../../pubky/auth'
import { copyText } from '../sharing/clipboard'
import './RingAuthorization.css'

type LinkState =
  | { state: 'loading' }
  | { state: 'ready'; authorizationUrl: string }
  | { state: 'expired' }
  | { state: 'failed'; error: string }

const QR_SIZE = 220

interface RingAuthorizationProps {
  request: AccessRequest
  /** Called with the approved session. A rejection is shown, and a new link can be created. */
  onApproved: (session: Session) => Promise<void>
  /** Offers approval with the in-memory development identity (testnet development only). */
  developmentApproval?: boolean
}

/** A Pubky Ring authorization request as a QR code and link. */
export function RingAuthorization({
  request,
  onApproved,
  developmentApproval,
}: RingAuthorizationProps) {
  const [attempt, setAttempt] = useState(0)
  // Each attempt gets its own link; until it exists, the link is loading.
  const [linkFor, setLinkFor] = useState<{ attempt: number; link: LinkState }>()
  const link: LinkState = linkFor?.attempt === attempt ? linkFor.link : { state: 'loading' }
  const [copied, setCopied] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    let flow: RingAuthFlow | undefined
    let active = true
    const setLink = (next: LinkState) => setLinkFor({ attempt, link: next })

    startRingAuthFlow(request).then(
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
            try {
              await onApproved(session)
            } catch (error) {
              setCompleting(false)
              setLink({ state: 'failed', error: describeError(error) })
            }
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
  }, [request, attempt, onApproved])

  const copyLink = async () => {
    if (link.state !== 'ready') return
    await copyText(link.authorizationUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div className="ring-authorization">
      <div className="ring-qr">
        {completing ? (
          <span className="ring-qr-placeholder">
            <LoaderCircle className="spinner" /> Signing in…
          </span>
        ) : (
          <QrCode link={link} />
        )}
      </div>
      <div className="ring-actions">
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
        {developmentApproval && link.state === 'ready' && (
          <button
            type="button"
            className="button button-outlined"
            onClick={() =>
              void approveWithDevelopmentIdentity(link.authorizationUrl).catch((error: unknown) =>
                setLinkFor({ attempt, link: { state: 'failed', error: describeError(error) } }),
              )
            }
          >
            Approve with development identity
          </button>
        )}
        <button
          type="button"
          className="button button-text"
          onClick={() => setAttempt(attempt + 1)}
        >
          <RefreshCw size={16} /> {link.state === 'expired' ? 'New link' : 'Refresh link'}
        </button>
        {link.state === 'failed' && <p className="field-error">{link.error}</p>}
      </div>
    </div>
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
      <span className="ring-qr-placeholder">
        <LoaderCircle className="spinner" /> Creating link…
      </span>
    )
  }
  if (link.state === 'expired') {
    return (
      <span className="ring-qr-placeholder">
        <strong>Link expired</strong> Create a new one.
      </span>
    )
  }
  if (link.state === 'failed') return <span className="ring-qr-placeholder">No link</span>
  return (
    <canvas
      ref={canvas}
      width={QR_SIZE}
      height={QR_SIZE}
      aria-label="Pubky Ring authorization QR code"
    />
  )
}
