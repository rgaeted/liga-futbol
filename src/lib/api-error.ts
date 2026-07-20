type FlattenedError = {
  formErrors?: string[]
  fieldErrors?: Record<string, string[]>
}

export function formatApiError(error: unknown, fallback = 'Error en la solicitud'): string {
  if (typeof error === 'string') return error

  if (error && typeof error === 'object') {
    const flat = error as FlattenedError
    const parts: string[] = []

    if (flat.formErrors?.length) {
      parts.push(...flat.formErrors)
    }

    if (flat.fieldErrors) {
      for (const [field, messages] of Object.entries(flat.fieldErrors)) {
        if (messages.length > 0) {
          parts.push(`${field}: ${messages.join(', ')}`)
        }
      }
    }

    if (parts.length > 0) return parts.join(' · ')
  }

  return fallback
}

export async function readApiError(res: Response, fallback?: string): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.error === 'string') return data.error
    if (data?.error) {
      return formatApiError(data.error, fallback ?? `Error ${res.status}`)
    }
  } catch {
    // respuesta sin JSON
  }
  return fallback ?? `Error ${res.status}`
}
