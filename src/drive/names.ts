// File and folder names: validation and conflict-free alternatives.

/** Zero-byte file that keeps an otherwise empty folder on the homeserver. Hidden in listings. */
export const FOLDER_MARKER = '.keep'

const MAX_NAME_BYTES = 255

/** Returns why `name` can't be used, or `undefined` when it's valid. */
export function nameProblem(name: string): string | undefined {
  if (name.trim() === '') return 'Enter a name.'
  if (name.includes('/') || name.includes('\\')) return 'Names can’t contain / or \\.'
  if (name === '.' || name === '..') return 'Names can’t be . or ..'
  if (name === FOLDER_MARKER) return `${FOLDER_MARKER} is reserved.`
  if (/\s$/.test(name)) return 'Names can’t end with a space.'
  if ([...name].some(isControlCharacter)) return 'Names can’t contain control characters.'
  if (new TextEncoder().encode(name).length > MAX_NAME_BYTES) return 'This name is too long.'
  return undefined
}

/** Splits `photo.final.jpg` into `photo.final` and `.jpg`. Folders and dotfiles have no extension. */
export function splitExtension(name: string, kind: 'file' | 'folder' = 'file') {
  const dot = name.lastIndexOf('.')
  if (kind === 'folder' || dot <= 0) return { base: name, extension: '' }
  return { base: name.slice(0, dot), extension: name.slice(dot) }
}

/**
 * Returns `name`, or the first free numbered variant (`name (1).txt`, `name (2).txt`, …) when
 * `taken` already contains it.
 */
export function uniqueName(name: string, taken: ReadonlySet<string>, kind: 'file' | 'folder') {
  if (!taken.has(name)) return name

  const { base, extension } = splitExtension(name, kind)
  for (let number = 1; ; number++) {
    const candidate = `${base} (${number})${extension}`
    if (!taken.has(candidate)) return candidate
  }
}

export function copyName(name: string) {
  return `Copy of ${name}`
}

function isControlCharacter(char: string) {
  const code = char.codePointAt(0) ?? 0
  return code < 0x20 || (code >= 0x7f && code < 0xa0)
}
