import { getRuntimeEditionConfig } from '../lib/runtime-config'

export function getThemeColors() {
  const edition = getRuntimeEditionConfig()
  return {
    primary: edition.primaryColor,
    secondary: edition.secondaryColor,
    background: '#FFFFFF',
    surface: '#F7F7F7',
    text: '#111111',
    textMuted: '#666666',
    error: '#B00020',
    border: '#E5E5E5',
  }
}

export const theme = getThemeColors()
