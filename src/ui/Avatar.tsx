/** A round avatar with a colour and letter derived from a public key. */
export function Avatar({ publicKey, size = 32 }: { publicKey: string; size?: number }) {
  const z32 = publicKey.replace(/^pubky/, '')
  let hash = 0
  for (const char of z32) hash = (hash * 31 + char.charCodeAt(0)) >>> 0

  return (
    <span
      aria-hidden
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `hsl(${hash % 360} 55% 42%)`,
        color: '#fff',
        fontSize: size * 0.45,
        fontWeight: 500,
        flex: 'none',
      }}
    >
      {z32.charAt(0).toUpperCase()}
    </span>
  )
}
