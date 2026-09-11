export const LOSLUNES_SLUG = 'loslunes'
export const LOSLUNES_LOGO_PATH = '/branding/loslunes-logo.png'
export const LOSLUNES_HERO_PATH = '/branding/loslunes-hero.jpg'
export const LOSLUNES_PRIMARY = '#F57F20'
export const LOSLUNES_SECONDARY = '#111111'

export const KELME_SLUG = 'kelme'
export const KELME_CUP_SHIELD_PATH = '/branding/kelme-cup-shield.png'
export const KELME_CUP_HUDDLE_PATH = '/branding/kelme-cup-huddle.jpg'
export const KELME_CUP_PITCH_PATH = '/branding/kelme-cup-pitch.jpg'
export const KELME_CUP_PRIMARY = '#1A7AE8'
export const KELME_CUP_SECONDARY = '#0B3D8F'

export const KELME_CUP = {
  region: 'Los Lagos',
  kicker: 'Invitación oficial a clubes y colegios',
  tagline: '¡Súmate al torneo más entretenido de la temporada!',
  values: 'Fútbol · Amigos · Valores y mucho más',
  subtitle: 'Torneo infantil de fútbol',
  blurb:
    'Abierto a clubes, colegios y escuelas de fútbol de la zona. Fútbol con nivel, buena organización y el respaldo de Kelme, pensado para que jueguen todos.',
  dateLabel: 'Domingo 25 de octubre',
  venue: 'Canchas Colegio Puerto Varas',
  timeLabel: 'Desde 9:00 a 14:00 horas',
  signupClose: 'Lunes 28 de septiembre',
  contactName: 'Cristian Catalán',
  whatsappDisplay: '+56 9 6347 4434',
  whatsappHref: 'https://wa.me/56963474434',
  email: 'cristiancatalan@deportivototal.cl',
} as const

export function resolveOrgLandingLogo(
  slug: string,
  storedLogoUrl: string | null | undefined,
): string | null {
  if (storedLogoUrl) return storedLogoUrl
  if (slug === LOSLUNES_SLUG) return LOSLUNES_LOGO_PATH
  if (slug === KELME_SLUG) return KELME_CUP_SHIELD_PATH
  return null
}

export function resolveOrgBrandColors(
  slug: string,
  primaryColor: string,
  secondaryColor: string,
): { primaryColor: string; secondaryColor: string } {
  if (slug === LOSLUNES_SLUG) {
    return { primaryColor: LOSLUNES_PRIMARY, secondaryColor: LOSLUNES_SECONDARY }
  }
  if (slug === KELME_SLUG) {
    return { primaryColor: KELME_CUP_PRIMARY, secondaryColor: KELME_CUP_SECONDARY }
  }
  return { primaryColor, secondaryColor }
}
