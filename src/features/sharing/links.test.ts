import { expect, test } from 'vitest'
import { parseViewerAddress, pubkyAddress } from './links'

const owner = '8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo'

test('a public address round-trips through the viewer route', () => {
  const address = pubkyAddress(owner, '/pub/pubky-drive/files/My Photos/ü.png')
  expect(address).toBe(`pubky${owner}/pub/pubky-drive/files/My%20Photos/%C3%BC.png`)
  expect(parseViewerAddress(address)).toEqual({
    ownerZ32: owner,
    path: '/pub/pubky-drive/files/My Photos/ü.png',
  })
})

test('private and malformed addresses are rejected', () => {
  expect(parseViewerAddress(`pubky${owner}/priv/secret.txt`)).toBeUndefined()
  expect(parseViewerAddress('pubkyshort/pub/a.txt')).toBeUndefined()
  expect(parseViewerAddress(`pubky${owner}/pub/%E0%A4%A.txt`)).toBeUndefined()
})
