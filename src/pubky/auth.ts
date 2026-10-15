// Pubky Ring sign-in, session persistence and sign-out.

import { AuthFlowKind, Keypair, PublicKey } from '@synonymdev/pubky'
import type { GrantAuthFlow, Session, Signer } from '@synonymdev/pubky'
import { APP_ID, HTTP_RELAY, STORAGE_NAMESPACE } from '../config'
import { requestedCapabilities, type AccessRequest } from '../drive/access'
import { pubky } from './client'

const SESSION_KEY = STORAGE_NAMESPACE
  ? `${STORAGE_NAMESPACE}:${APP_ID}:session`
  : `${APP_ID}:session`
const RING_AUTH_CANCELED_ERROR_NAME = 'RingAuthCanceled'
const RING_AUTH_EXPIRED_ERROR_NAME = 'RingAuthExpired'

/** A pending Pubky Ring authorization. */
export interface RingAuthFlow {
  authorizationUrl: string
  awaitApproval: Promise<Session>
  cancel: () => void
}

export async function startRingAuthFlow(request: AccessRequest): Promise<RingAuthFlow> {
  const flow = await pubky.startGrantAuthFlow(
    requestedCapabilities(request),
    AuthFlowKind.signin(),
    {
      clientId: APP_ID,
      relay: HTTP_RELAY,
    },
  )
  const approval = awaitRingApproval(flow)

  return {
    authorizationUrl: flow.authorizationUrl,
    awaitApproval: approval.awaitApproval,
    cancel: approval.cancel,
  }
}

/**
 * The identity created by `signupDevelopmentUser`, kept in memory so later access requests can be
 * approved without Pubky Ring. Development only; it's gone after a reload.
 */
let developmentSigner: Signer | undefined

/**
 * Development only: creates a random identity on `homeserver` and approves a Drive-folder
 * sign-in with it, like Pubky Ring would. Requires `signup_mode = "open"` on the homeserver.
 */
export async function signupDevelopmentUser(homeserver: string) {
  const signer = pubky.signer(Keypair.random())
  try {
    await signer.signup(PublicKey.from(homeserver.trim()), null)
  } catch (error) {
    throw new Error(
      'This homeserver does not allow open signup. Start it with \'signup_mode = "open"\' to create identities.',
      { cause: error },
    )
  }

  developmentSigner = signer
  const flow = await startRingAuthFlow('drive')
  await signer.approveAuthRequest(flow.authorizationUrl)
  return flow.awaitApproval
}

/** Whether the development identity of `publicKeyZ32` is available to approve requests. */
export function hasDevelopmentIdentity(publicKeyZ32: string) {
  return developmentSigner?.publicKey.z32() === publicKeyZ32
}

/** Development only: approves an authorization request with the development identity. */
export async function approveWithDevelopmentIdentity(authorizationUrl: string) {
  if (!developmentSigner) throw new Error('No development identity is available.')
  await developmentSigner.approveAuthRequest(authorizationUrl)
}

export async function saveSession(session: Session) {
  const stored = await pubky.browserSessionStore.save(session)
  localStorage.setItem(SESSION_KEY, stored.id)
}

/** The saved session, or `undefined` when there is none or it's no longer valid. */
export async function restoreSavedSession() {
  const savedId = localStorage.getItem(SESSION_KEY)
  if (!savedId) return undefined

  try {
    return await pubky.browserSessionStore.restore(savedId)
  } catch (error) {
    if (isInvalidSavedSessionError(error)) {
      await forgetSavedSession(savedId)
      return undefined
    }
    throw error
  }
}

/**
 * Saves `next`, a session with different access for the same identity, in place of `current`,
 * then ends `current` on the homeserver. Throws when `next` belongs to another identity.
 */
export async function replaceSession(current: Session, next: Session) {
  if (next.info.publicKey.z32() !== current.info.publicKey.z32()) {
    throw new Error(
      'Pubky Ring approved with a different identity. Approve with the identity you signed in with.',
    )
  }
  const previousId = localStorage.getItem(SESSION_KEY)
  await saveSession(next)
  try {
    await current.signout()
  } catch {
    // The previous grant may already have expired; the new session works either way.
  }
  if (previousId) await pubky.browserSessionStore.remove(previousId).catch(() => {})
}

/** Ends the session on the homeserver (in every tab) and forgets it locally. */
export async function signOut(session: Session) {
  const savedId = localStorage.getItem(SESSION_KEY)
  await session.signout()
  await forgetSavedSession(savedId)
}

export function isRingAuthCanceled(error: unknown) {
  return error instanceof Error && error.name === RING_AUTH_CANCELED_ERROR_NAME
}

export function isRingAuthExpired(error: unknown) {
  return error instanceof Error && error.name === RING_AUTH_EXPIRED_ERROR_NAME
}

function awaitRingApproval(flow: GrantAuthFlow) {
  let canceled = false
  let freed = false

  const cancel = () => {
    canceled = true
    if (freed) return
    freed = true
    try {
      flow.free()
    } catch {
      // The WASM handle can already be consumed or freed by the time cleanup runs.
    }
  }

  const awaitApproval = (async () => {
    try {
      const session = await flow.awaitApproval()
      if (canceled) throw namedError(RING_AUTH_CANCELED_ERROR_NAME, 'Pubky Ring sign-in canceled')
      return session
    } catch (error) {
      if (canceled) throw namedError(RING_AUTH_CANCELED_ERROR_NAME, 'Pubky Ring sign-in canceled')
      if (/expired|timed out|timeout/i.test(String(error))) {
        throw namedError(
          RING_AUTH_EXPIRED_ERROR_NAME,
          'The sign-in link expired. Create a new one.',
        )
      }
      throw error
    }
  })()

  return { awaitApproval: awaitApproval.finally(cancel), cancel }
}

async function forgetSavedSession(savedId: string | null) {
  localStorage.removeItem(SESSION_KEY)
  if (!savedId) return
  try {
    await pubky.browserSessionStore.remove(savedId)
  } catch {
    // Local IndexedDB state may already be gone after a failed restore.
  }
}

function isInvalidSavedSessionError(error: unknown) {
  return (
    error instanceof Error &&
    ['AuthenticationError', 'InvalidInput', 'ClientStateError'].includes(error.name)
  )
}

function namedError(name: string, message: string) {
  const error = new Error(message)
  error.name = name
  return error
}
