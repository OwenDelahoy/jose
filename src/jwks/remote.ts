import type {
  KeyObject,
  JWSHeaderParameters,
  JWK,
  FlattenedJWSInput,
  GetKeyFunction,
} from '../types.d'
import parseJWK from '../jwk/parse.js'
import {
  JWKSInvalid,
  JOSENotSupported,
  JWKSNoMatchingKey,
  JWKSMultipleMatchingKeys,
} from '../util/errors.js'
import fetchJwks from '../runtime/fetch_jwks.js'
import isObject from '../lib/is_object.js'

function getKtyFromAlg(alg: string) {
  switch (alg.substr(0, 2)) {
    case 'RS':
    case 'PS':
      return 'RSA'
    case 'ES':
      return 'EC'
    case 'Ed':
      return 'OKP'
    default:
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set')
  }
}

interface Cache {
  [alg: string]: KeyObject | CryptoKey
}

/**
 * Options for the remote JSON Web Key Set.
 */
export interface RemoteJWKSetOptions {
  /**
   * Timeout for the HTTP request. When reached the request will be
   * aborted and the verification will fail. Default is 5000.
   */
  timeoutDuration?: number

  /**
   * Duration for which no more HTTP requests will be triggered
   * after a previous successful fetch. Default is 30000.
   */
  cooldownDuration?: number

  /**
   * An instance of [http.Agent](https://nodejs.org/api/http.html#http_class_http_agent)
   * or [https.Agent](https://nodejs.org/api/https.html#https_class_https_agent) to pass
   * to the [http.get](https://nodejs.org/api/http.html#http_http_get_options_callback)
   * or [https.get](https://nodejs.org/api/https.html#https_https_get_options_callback)
   * method's options. Use when behind an http(s) proxy.
   * This is a Node.js runtime specific option, it is ignored
   * when used outside of Node.js runtime.
   */
  agent?: any

  /**
   * A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials.
   */
  credentials?: 'include' | 'omit' | 'same-origin';

  /**
   * A Headers object, an object literal, or an array of two-item arrays to set request's headers.
   */
  headers?: string[][] | Record<string, string>

  /**
   * A string to set request's method.
   */
  method?: string;

  /**
   * A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode.
   */
  mode?: 'cors' | 'navigate' | 'no-cors' | 'same-origin';

  /**
   * A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.
   */
  redirect?: 'error' | 'follow' | 'manual';

  /**
   * A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer.
   */
  referrer?: string;
  
  /**
   * A referrer policy to set request's referrerPolicy.
   */
  referrerPolicy?: '' | 'same-origin' | 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
}

function isJWKLike(key: unknown): key is JWK {
  return isObject(key)
}

class RemoteJWKSet {
  private _url: URL

  private _timeoutDuration: number

  private _cooldownDuration: number

  private _cooldownStarted?: number

  private _jwks?: { keys: JWK[] }

  private _cached: WeakMap<JWK, Cache> = new WeakMap()

  private _pendingFetch?: Promise<unknown>

  private _options: Pick<RemoteJWKSetOptions, 
      'agent'
      |'credentials'
      |'redirect'
      |'referrer'
      |'referrerPolicy'
      |'method' 
      |'mode' 
      |'headers'
    >

  constructor(url: URL, options?: RemoteJWKSetOptions) {
    if (!(url instanceof URL)) {
      throw new TypeError('url must be an instance of URL')
    }
    this._url = new URL(url.href)
    this._options = {
      agent: options?.agent,
      credentials: options?.credentials,
      redirect: options?.redirect,
      referrer: options?.referrer,
      referrerPolicy: options?.referrerPolicy,
      method: options?.method, 
      mode: options?.mode, 
      headers: options?.headers,
    }
    
    this._timeoutDuration =
      typeof options?.timeoutDuration === 'number' ? options?.timeoutDuration : 5000
    this._cooldownDuration =
      typeof options?.cooldownDuration === 'number' ? options?.cooldownDuration : 30000
  }

  coolingDown() {
    if (typeof this._cooldownStarted === 'undefined') {
      return false
    }

    return Date.now() < this._cooldownStarted + this._cooldownDuration
  }

  async getKey(protectedHeader: JWSHeaderParameters): Promise<KeyObject | CryptoKey> {
    if (!this._jwks) {
      await this.reload()
    }

    const candidates = this._jwks!.keys.filter((jwk) => {
      // filter keys based on the mapping of signature algorithms to Key Type
      let candidate = jwk.kty === getKtyFromAlg(protectedHeader.alg!)

      // filter keys based on the JWK Key ID in the header
      if (candidate && typeof protectedHeader.kid === 'string') {
        candidate = protectedHeader.kid === jwk.kid
      }

      // filter keys based on the key's declared Algorithm
      if (candidate && typeof jwk.alg === 'string') {
        candidate = protectedHeader.alg! === jwk.alg
      }

      // filter keys based on the key's declared Public Key Use
      if (candidate && typeof jwk.use === 'string') {
        candidate = jwk.use === 'sig'
      }

      // filter keys based on the key's declared Key Operations
      if (candidate && Array.isArray(jwk.key_ops)) {
        candidate = jwk.key_ops.includes('verify')
      }

      // filter out non-applicable OKP Sub Types
      if (candidate && protectedHeader.alg! === 'EdDSA') {
        candidate = ['Ed25519', 'Ed448'].includes(jwk.crv!)
      }

      // filter out non-applicable EC curves
      if (candidate) {
        switch (protectedHeader.alg!) {
          case 'ES256':
            candidate = jwk.crv === 'P-256'
            break
          case 'ES256K':
            candidate = jwk.crv === 'secp256k1'
            break
          case 'ES384':
            candidate = jwk.crv === 'P-384'
            break
          case 'ES512':
            candidate = jwk.crv === 'P-521'
            break
          default:
        }
      }

      return candidate
    })

    const { 0: jwk, length } = candidates

    if (length === 0) {
      if (this.coolingDown() === false) {
        await this.reload()
        return this.getKey(protectedHeader)
      }
      throw new JWKSNoMatchingKey()
    } else if (length !== 1) {
      throw new JWKSMultipleMatchingKeys()
    }

    if (!this._cached.has(jwk)) {
      this._cached.set(jwk, {})
    }

    const cached = this._cached.get(jwk)!
    if (cached[protectedHeader.alg!] === undefined) {
      const keyObject = <KeyObject | CryptoKey>await parseJWK({ ...jwk, alg: protectedHeader.alg! })

      if (keyObject.type !== 'public') {
        throw new JWKSInvalid('JSON Web Key Set members must be public keys')
      }

      cached[protectedHeader.alg!] = keyObject
    }

    return cached[protectedHeader.alg!]
  }

  async reload() {
    if (!this._pendingFetch) {
      this._pendingFetch = fetchJwks(this._url, this._timeoutDuration, this._options)
        .then((json) => {
          if (
            typeof json !== 'object' ||
            !json ||
            !Array.isArray(json.keys) ||
            !json.keys.every(isJWKLike)
          ) {
            throw new JWKSInvalid('JSON Web Key Set malformed')
          }

          this._jwks = { keys: json.keys }
          this._cooldownStarted = Date.now()
          this._pendingFetch = undefined
        })
        .catch((err: Error) => {
          this._pendingFetch = undefined
          throw err
        })
    }

    await this._pendingFetch
  }
}

/**
 * Returns a function that resolves to a key object downloaded from a
 * remote endpoint returning a JSON Web Key Set, that is, for example,
 * an OAuth 2.0 or OIDC jwks_uri. Only a single public key must match
 * the selection process.
 *
 * @example ESM import
 * ```js
 * import { createRemoteJWKSet } from 'jose/jwks/remote'
 * ```
 *
 * @example CJS import
 * ```js
 * const { createRemoteJWKSet } = require('jose/jwks/remote')
 * ```
 *
 * @example Deno import
 * ```js
 * import { createRemoteJWKSet } from 'https://deno.land/x/jose@VERSION/jwks/remote.ts'
 * ```
 *
 * @example Usage
 * ```js
 * import { jwtVerify } from 'jose/jwt/verify'
 *
 * const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
 *
 * const { payload, protectedHeader } = await jwtVerify(jwt, JWKS, {
 *   issuer: 'urn:example:issuer',
 *   audience: 'urn:example:audience'
 * })
 * console.log(protectedHeader)
 * console.log(payload)
 * ```
 *
 * @param url URL to fetch the JSON Web Key Set from.
 * @param options Options for the remote JSON Web Key Set.
 */
function createRemoteJWKSet(
  url: URL,
  options?: RemoteJWKSetOptions,
): GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput> {
  return RemoteJWKSet.prototype.getKey.bind(new RemoteJWKSet(url, options))
}

export { createRemoteJWKSet }
export default createRemoteJWKSet
