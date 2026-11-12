export type SponsorVisibility = {
  isActive: boolean
  startsAt: Date | null
  endsAt: Date | null
}

export function isSponsorPubliclyVisible(sponsor: SponsorVisibility, now: Date): boolean {
  if (!sponsor.isActive) return false
  if (sponsor.startsAt && now < sponsor.startsAt) return false
  if (sponsor.endsAt && now > sponsor.endsAt) return false
  return true
}
