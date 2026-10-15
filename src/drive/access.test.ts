import { validateCapabilities } from '@synonymdev/pubky'
import { describe, expect, test } from 'vitest'
import { accessFromCapabilities, canWrite, homeserverLevel, requestedCapabilities } from './access'

describe('requestedCapabilities', () => {
  const requested = (request: Parameters<typeof requestedCapabilities>[0]) =>
    validateCapabilities(requestedCapabilities(request)).split(',').sort()

  test('the Drive folder only', () => {
    expect(requested('drive')).toEqual(['/priv/pubky-drive/:rw', '/pub/pubky-drive/:rw'])
  })

  test('viewing the homeserver adds read access to both roots', () => {
    expect(requested('view')).toEqual([
      '/priv/:r',
      '/priv/pubky-drive/:rw',
      '/pub/:r',
      '/pub/pubky-drive/:rw',
    ])
  })

  test('managing the homeserver asks for both roots', () => {
    expect(requested('manage')).toEqual(['/priv/:rw', '/pub/:rw'])
  })
})

describe('accessFromCapabilities', () => {
  const driveRoots = { public: '/pub/pubky-drive/files/', private: '/priv/pubky-drive/files/' }

  test('Drive-folder approval gives both Drive areas and app data, but no homeserver', () => {
    const access = accessFromCapabilities(['/pub/pubky-drive/:rw', '/priv/pubky-drive/:rw'])
    expect(access).toEqual({ roots: driveRoots, appData: true, homeserver: {} })
    expect(homeserverLevel(access)).toBeUndefined()
  })

  test('view approval reads the homeserver but writes only the Drive', () => {
    const access = accessFromCapabilities([
      '/pub/pubky-drive/:rw',
      '/priv/pubky-drive/:rw',
      '/pub/:r',
      '/priv/:r',
    ])
    expect(homeserverLevel(access)).toBe('view')
    expect(canWrite(access, '/pub/pubky-drive/files/a.txt')).toBe(true)
    expect(canWrite(access, '/pub/pubky.app/profile.json')).toBe(false)
    expect(canWrite(access, '/priv/pubky-drive/bin/x/entry.json')).toBe(true)
    expect(canWrite(access, '/priv/pubky-drive/')).toBe(false)
  })

  test('manage approval keeps the Drive areas and writes everywhere', () => {
    const access = accessFromCapabilities(['/pub/:rw', '/priv/:rw'])
    expect(access.roots).toEqual(driveRoots)
    expect(homeserverLevel(access)).toBe('manage')
    expect(canWrite(access, '/pub/pubky.app/profile.json')).toBe(true)
  })

  test('a narrowed approval leaves the missing parts unavailable', () => {
    const access = accessFromCapabilities(['/pub/pubky-drive/:rw', '/pub/:r'])
    expect(access).toEqual({
      roots: { public: driveRoots.public },
      appData: false,
      homeserver: { public: 'view' },
    })
    expect(homeserverLevel(access)).toBeUndefined()
  })
})
