/** Copies `text` to the clipboard, with a fallback for insecure (non-HTTPS) development origins. */
export async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.append(textArea)
  textArea.select()
  try {
    if (!document.execCommand('copy')) throw new Error('Copying to the clipboard failed.')
  } finally {
    textArea.remove()
  }
}
