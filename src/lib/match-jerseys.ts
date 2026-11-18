/** Dorsal del partido si existe; si no, el permanente del jugador. */
export function effectiveJersey(
  matchNumber: number | null | undefined,
  permanent: number | null | undefined,
): number | null {
  return matchNumber ?? permanent ?? null
}

export function jerseyLabel(label: string, number: number | null): string {
  return `#${number ?? '—'} ${label}`
}
