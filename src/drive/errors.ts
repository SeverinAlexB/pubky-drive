// Errors from the homeserver and from Drive operations.

/** HTTP status of a homeserver error, when the SDK reported one. */
export function statusCodeOf(error: unknown): number | undefined {
  if (!isRecord(error) || !isRecord(error.data)) return undefined
  const statusCode = error.data.statusCode
  return typeof statusCode === 'number' ? statusCode : undefined
}

export function isNotFound(error: unknown) {
  const status = statusCodeOf(error)
  return status === 404 || status === 410
}

/** A user-facing explanation of an error. */
export function describeError(error: unknown): string {
  switch (statusCodeOf(error)) {
    case 401:
    case 403:
      return 'This session isn’t allowed to do that. Sign out and sign in again to grant access.'
    case 404:
      return 'This item no longer exists.'
    case 409:
      return 'A file and a folder can’t have the same name in one folder.'
    case 423:
      return 'This file is locked by another app. Try again later.'
    case 429:
      return 'The homeserver is busy. Try again in a moment.'
    case 507:
      return 'Your homeserver storage is full.'
  }
  if (error instanceof Error) return error.message
  return String(error)
}

/** A name that is already used in the target folder. */
export class NameTakenError extends Error {
  constructor(name: string) {
    super(`An item named ‘${name}’ already exists.`)
    this.name = 'NameTakenError'
  }
}

/** A multi-file operation that stopped partway. Earlier steps stay applied. */
export class PartialOperationError extends Error {
  readonly completed: number
  readonly total: number

  constructor(verb: string, completed: number, total: number, failedName: string, cause: unknown) {
    super(
      `${verb} ${completed} of ${total}. Couldn’t continue with ‘${failedName}’: ${describeError(cause)}`,
    )
    this.name = 'PartialOperationError'
    this.completed = completed
    this.total = total
    this.cause = cause
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
