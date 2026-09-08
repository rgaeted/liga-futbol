import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/** Invalida la landing pública de la org (portal /{slug}). */
export async function revalidateOrgPublicLanding(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true },
  })
  if (!org) return
  revalidatePath(`/${org.slug}`, 'page')
}

/** Revalida el portal tras cambios en un partido (resultado, MVP, etc.). */
export async function revalidateOrgPublicLandingForMatch(matchId: string) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { organizationId: true },
  })
  if (!match) return
  await revalidateOrgPublicLanding(match.organizationId)
}
