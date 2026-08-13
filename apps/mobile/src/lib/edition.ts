import puertoVaras2026 from '../../editions/liga-invierno-kelme-puerto-varas-2026/edition.config'

export type EditionConfig = {
  key: string
  slug: string
  displayName: string
  shortName: string
  urlScheme: string
  iosBundleIdentifier: string
  androidPackage: string
  apiBaseUrl: string
  supabaseUrl: string
  supabaseAnonKey: string
  primaryColor: string
  secondaryColor: string
  assetsDir: string
}

const EDITIONS: Record<string, EditionConfig> = {
  [puertoVaras2026.key]: puertoVaras2026,
}

export function getEditionConfig(editionKey: string): EditionConfig {
  const config = EDITIONS[editionKey]
  if (!config) {
    throw new Error(`Edición desconocida: ${editionKey}`)
  }
  return config
}

export function resolveEditionKey(): string {
  const editionKey = process.env.EDITION ?? process.env.EXPO_PUBLIC_EDITION
  if (!editionKey) {
    throw new Error('Debes definir la variable EDITION para compilar la app móvil')
  }
  return editionKey
}

export function getActiveEditionConfig(): EditionConfig {
  return getEditionConfig(resolveEditionKey())
}
