import { formatApiError } from '@/lib/api-error'

export type SubmitResult = { ok: true } | { ok: false; message: string }

export async function submitJson(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<SubmitResult> {
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    return { ok: false, message: 'No se pudo conectar con el servidor' }
  }

  if (res.ok) return { ok: true }

  let message = `Error ${res.status}`
  try {
    const data = await res.json()
    if (typeof data?.error === 'string') {
      message = data.error
    } else if (data?.error) {
      message = formatApiError(data.error, message)
    }
  } catch {
    // respuesta sin JSON
  }
  return { ok: false, message }
}
