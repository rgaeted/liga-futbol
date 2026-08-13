export class MobileApiError extends Error {
  readonly userMessage: string
  readonly causeCode: string

  constructor(userMessage: string, causeCode: string, cause?: unknown) {
    super(userMessage)
    this.name = 'MobileApiError'
    this.userMessage = userMessage
    this.causeCode = causeCode
    if (cause instanceof Error) this.cause = cause
  }
}

export function toUserSafeError(error: unknown): MobileApiError {
  if (error instanceof MobileApiError) return error
  return new MobileApiError('No pudimos cargar la información', 'unknown', error)
}
