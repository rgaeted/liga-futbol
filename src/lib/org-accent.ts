const NIGHT = '#0B1210'
const FLOOD = '#E8E4D8'

export function orgAccentForeground(hex: string): typeof NIGHT | typeof FLOOD {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim())
  if (!match) return FLOOD
  const value = match[1]
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? NIGHT : FLOOD
}
