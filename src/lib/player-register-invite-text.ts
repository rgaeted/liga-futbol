export function playerRegisterInviteText(
  playerName: string,
  url: string,
  organizationName?: string | null,
): string {
  const org = organizationName?.trim() ? ` de ${organizationName.trim()}` : ''
  return `Hola ${playerName}, crea tu cuenta${org} con este link personal: ${url}`
}
