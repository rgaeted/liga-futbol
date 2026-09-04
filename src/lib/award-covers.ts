export type AwardCoverIcon =
  | 'lungs'
  | 'column'
  | 'star'
  | 'cart'
  | 'commit'
  | 'medal'

type CoverRule = {
  match: string
  src: string
  icon: AwardCoverIcon
}

const COVERS: CoverRule[] = [
  { match: 'pulmones', src: '/branding/awards/siete-pulmones.jpg', icon: 'lungs' },
  { match: 'patrimonio', src: '/branding/awards/patrimonio.jpg', icon: 'column' },
  { match: 'highlander', src: '/branding/awards/highlander.jpg', icon: 'star' },
  { match: 'mourinho', src: '/branding/awards/mourinho.jpg', icon: 'cart' },
  { match: 'compromiso', src: '/branding/awards/compromiso.jpg', icon: 'commit' },
  { match: 'trayectoria', src: '/branding/awards/trayectoria.jpg', icon: 'medal' },
]

export const AWARDS_LOCKER_BG = '/branding/awards/locker-bg.jpg'

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function resolveAwardCover(name: string, shortLabel: string): {
  src: string
  icon: AwardCoverIcon
} {
  const haystack = fold(`${name} ${shortLabel}`)
  const hit = COVERS.find((rule) => haystack.includes(rule.match))
  return hit ?? { src: AWARDS_LOCKER_BG, icon: 'star' }
}

export function awardDisplayTitle(name: string, shortLabel: string): string {
  const cleaned = name.replace(/^premio\s+/i, '').trim()
  const shortFold = fold(shortLabel)
  const nameFold = fold(cleaned)
  if (shortFold && shortFold !== nameFold && !nameFold.includes(shortFold)) {
    return shortLabel
  }
  return cleaned || shortLabel || name
}
