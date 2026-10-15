import { validateCapabilities } from '@synonymdev/pubky'
import { describe, expect, test } from 'vitest'
import { accessFromCapabilities, requestedCapabilities } from './access'

describe('requestedCapabilities', () => {
  test('drive-folder mode asks only for the app folders', () => {
    expect(validateCapabilities(requestedCapabilities('drive-folder')).split(',').sort()).toEqual([
      '/priv/pubky-drive/:rw',
      '/pub/pubky-drive/:rw',
    ])
  })

  test('entire-homeserver mode asks for both storage roots', () => {
    expect(
      validateCapabilities(requestedCapabilities('entire-homeserver')).split(',').sort(),
    ).toEqual(['/priv/:rw', '/pub/:rw'])
  })
})

describe('accessFromCapabilities', () => {
  test('drive-folder approval gives both app areas and app data', () => {
    expect(accessFromCapabilities(['/pub/pubky-drive/:rw', '/priv/pubky-drive/:rw'])).toEqual({
      mode: 'drive-folder',
      roots: { public: '/pub/pubky-drive/files/', private: '/priv/pubky-drive/files/' },
      appData: true,
    })
  })

  test('entire-homeserver approval browses from the storage roots', () => {
    expect(accessFromCapabilities(['/pub/:rw', '/priv/:rw'])).toEqual({
      mode: 'entire-homeserver',
      roots: { public: '/pub/', private: '/priv/' },
      appData: true,
    })
  })

  test('a root capability covers everything', () => {
    expect(accessFromCapabilities(['/:rw']).roots).toEqual({ public: '/pub/', private: '/priv/' })
  })

  test('a narrowed approval leaves the missing area and app data unavailable', () => {
    expect(accessFromCapabilities(['/pub/pubky-drive/:rw'])).toEqual({
      mode: 'drive-folder',
      roots: { public: '/pub/pubky-drive/files/' },
      appData: false,
    })
  })

  test('read-only access is not enough for an area', () => {
    expect(accessFromCapabilities(['/pub/pubky-drive/:r']).roots).toEqual({})
  })
})
