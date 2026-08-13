import type { z } from 'zod'
import { getApiBaseUrl } from '../lib/runtime-config'
import { MobileApiError, toUserSafeError } from '../lib/errors'

export class MobileApiClient {
  constructor(private readonly baseUrl = getApiBaseUrl()) {}

  async get<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    try {
      const url = `${this.baseUrl}${path}`
      const response = await fetch(url, {
        ...init,
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(init?.headers ?? {}),
        },
      })

      if (!response.ok) {
        throw new MobileApiError('No pudimos cargar la información', `http_${response.status}`)
      }

      let json: unknown
      try {
        json = await response.json()
      } catch {
        throw new MobileApiError('No pudimos cargar la información', 'invalid_json')
      }

      return schema.parse(json)
    } catch (error) {
      if (error instanceof MobileApiError) throw error
      if (error instanceof Error && error.name === 'ZodError') {
        throw new MobileApiError('No pudimos cargar la información', 'schema_mismatch', error)
      }
      throw toUserSafeError(error)
    }
  }
}

export const mobileApiClient = new MobileApiClient()
