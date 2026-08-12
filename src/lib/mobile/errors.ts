export class MobileApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'MobileApiError'
  }
}

export function mobileErrorResponse(error: unknown): Response {
  if (error instanceof MobileApiError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error('mobile_api_failed', {
    reason: error instanceof Error ? error.name : 'unknown_error',
  })
  return Response.json({ error: 'No se pudo completar la solicitud' }, { status: 500 })
}
