import crypto, { isCryptoKey } from './webcrypto.js'
import type { JWKConvertFunction } from '../interfaces.d'
import type { JWK } from '../../types.d'
import invalidKeyInput from './invalid_key_input.js'
import { encode as base64url } from './base64url.js'

const keyToJWK: JWKConvertFunction = async (key: unknown): Promise<JWK> => {
  if (key instanceof Uint8Array) {
    return {
      kty: 'oct',
      k: base64url(key),
    }
  }
  if (!isCryptoKey(key)) {
    throw new TypeError(invalidKeyInput(key, 'CryptoKey', 'Uint8Array'))
  }
  if (!key.extractable) {
    throw new TypeError('non-extractable CryptoKey cannot be exported as a JWK')
  }
  // @deno-expect-error
  const { ext, key_ops, alg, use, ...jwk } = await crypto.subtle.exportKey('jwk', key)

  // @deno-expect-error
  return <JWK>jwk
}
export default keyToJWK
