import { Pubky } from '@synonymdev/pubky'
import { IS_TESTNET, TESTNET_HOST } from '../config'

/** The app's single SDK facade. Reusing it keeps transports and caches warm. */
export const pubky = IS_TESTNET ? Pubky.testnet(TESTNET_HOST) : new Pubky()
