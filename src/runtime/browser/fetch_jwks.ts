import type { FetchFunction } from '../interfaces.d'
import { JOSEError } from '../../util/errors.js'
import globalThis from './global.js'

const fetchJwks: FetchFunction = async (url: URL, timeout: number) => {
  let controller!: AbortController
  if (typeof AbortController === 'function') {
    controller = new AbortController()
    setTimeout(() => controller.abort(), timeout)
  }

  const response = await globalThis.fetch(url.href, {
    signal: controller ? controller.signal : undefined,
    redirect: 'manual',
    referrerPolicy: 'no-referrer',
    credentials: 'omit',
    mode: 'cors',
    method: 'GET',
  })

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
