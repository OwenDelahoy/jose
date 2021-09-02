import type { FetchFunction } from '../interfaces.d'
import { JOSEError } from '../../util/errors.js'
import globalThis from './global.js'


type AcceptedRequestOptions = Pick<
  RequestInit,
  "credentials"
  | "redirect"
  | "referrer"
  | "referrerPolicy"
  | "method"
  | "mode"
  | "headers"
>

const fetchJwks: FetchFunction = async (url: URL, timeout: number, options: AcceptedRequestOptions) => {
  let controller!: AbortController
  if (typeof AbortController === 'function') {
    controller = new AbortController()
    setTimeout(() => controller.abort(), timeout)
  }


  const fetchOptions = Object.assign(
    {
      signal: controller ? controller.signal : undefined,
      credentials: 'omit',
      method: 'GET',
      mode: 'cors',
      referrerPolicy: 'no-referrer',
      redirect: 'manual',
    },
    options,
  )

  const response = await globalThis.fetch(url.href, fetchOptions)

  if (response.status !== 200) {
    throw new JOSEError('Expected 200 OK from the JSON Web Key Set HTTP response')
  }

  try {
    return await response.json()
  } catch {
    throw new JOSEError('Failed to parse the JSON Web Key Set HTTP response as JSON')
  }
}
export default fetchJwks
