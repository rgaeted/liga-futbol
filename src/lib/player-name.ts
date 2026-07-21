export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
