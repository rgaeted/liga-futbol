export type ParsePhoneResult =
  | { ok: true; digits: string }
  | { ok: false; error: 'invalid' }

export function parseContactPhone(raw: string): ParsePhoneResult {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return { ok: false, error: 'invalid' }
  return { ok: true, digits: normalizeChilePhone(raw) }
}

export function normalizeChilePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('56')) return digits
  if (digits.startsWith('0')) digits = digits.slice(1)
  return `56${digits}`
}

export function whatsappMeUrl(raw: string): string {
  return `https://wa.me/${normalizeChilePhone(raw)}`
}
