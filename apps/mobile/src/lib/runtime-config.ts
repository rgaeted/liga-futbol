import Constants from 'expo-constants'
import type { EditionConfig } from './edition'
import { getEditionConfig } from './edition'

type ExtraConfig = {
  editionKey?: string
  leagueSlug?: string
  apiBaseUrl?: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  primaryColor?: string
  secondaryColor?: string
}

export function getRuntimeExtra(): ExtraConfig {
  return (Constants.expoConfig?.extra ?? {}) as ExtraConfig
}

export function getRuntimeEditionConfig(): EditionConfig {
  const extra = getRuntimeExtra()
  if (extra.editionKey) {
    return getEditionConfig(extra.editionKey)
  }
  return getEditionConfig('liga-invierno-kelme-puerto-varas-2026')
}

export function getLeagueSlug(): string {
  return getRuntimeExtra().leagueSlug ?? getRuntimeEditionConfig().slug
}

export function getApiBaseUrl(): string {
  return getRuntimeExtra().apiBaseUrl ?? getRuntimeEditionConfig().apiBaseUrl
}

export function getPrimaryColor(): string {
  return getRuntimeExtra().primaryColor ?? getRuntimeEditionConfig().primaryColor
}
