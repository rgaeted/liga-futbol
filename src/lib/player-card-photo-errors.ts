export const PLAYER_CARD_PROCESSING_ERROR_MESSAGES = new Set([
  'No se pudo separar a la persona de la foto.',
  'Tu navegador no permite procesar esta foto.',
  'No se pudo abrir el recorte de la foto.',
  'No se detectó una persona en la foto.',
  'Se detectó más de una persona. Usa una foto individual.',
  'Tu navegador no permite generar el recorte.',
  'No se pudo exportar el recorte.',
  'El recorte procesado no puede superar 2 MB.',
  'El encuadre de la foto no es válido.',
])

export function playerCardProcessingErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error &&
    error.message &&
    PLAYER_CARD_PROCESSING_ERROR_MESSAGES.has(error.message)
    ? error.message
    : fallback
}
