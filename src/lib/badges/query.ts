import 'server-only'

import { OrganizationStatus } from '@prisma/client'
import { getBadgeDefinition } from '@/lib/badges/registry'
import type { BadgeFamily } from '@/lib/badges/types'
import { db } from '@/lib/db'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

export type PlayerBadgeVitrinaItemDto = {
  predicateId: string
  name: string
  description: string
  rarity: string
  iconKey: string
  locked: boolean
  proximamente: boolean
  veces: number
  context: string | null
}

export type PlayerBadgeVitrinaDto = {
  playerNombre: string
  orgName: string
  enabled: true
  ganadasDistintas: number
  totalCatalogo: number
  familias: Array<{
    family: BadgeFamily
    label: string
    items: PlayerBadgeVitrinaItemDto[]
  }>
}

export const BADGE_FAMILY_LABELS: Record<BadgeFamily, string> = {
  clutch: 'Momentos decisivos',
  goleador: 'Goleador',
  creador: 'Creador',
  muralla: 'Muralla',
  constancia: 'Constancia — el corazón del club',
  camarin: 'Camarín — con cariño',
  hitos: 'Hitos de carrera',
}

export const BADGE_FAMILY_ORDER: BadgeFamily[] = [
  'clutch',
  'goleador',
  'creador',
  'muralla',
  'constancia',
  'camarin',
  'hitos',
]

export async function getPlayerBadgeVitrina(
  organizationSlug: string,
  playerId: string,
): Promise<
  { kind: 'ok'; vitrina: PlayerBadgeVitrinaDto } | { kind: 'not_found' } | { kind: 'paused' }
> {
  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true, name: true, status: true, badgesEnabled: true },
  })

  if (!org) return { kind: 'not_found' }
  if (org.status === OrganizationStatus.PAUSED) return { kind: 'paused' }
  if (!org.badgesEnabled) return { kind: 'not_found' }

  const player = await db.player.findFirst({
    where: { id: playerId, organizationId: org.id },
    include: PLAYER_PERSON_NAME_INCLUDE,
  })

  if (!player) return { kind: 'not_found' }

  const [catalog, grants] = await Promise.all([
    db.orgBadge.findMany({
      where: { organizationId: org.id },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    db.playerBadge.findMany({
      where: { playerId, organizationId: org.id },
      orderBy: { awardedAt: 'desc' },
      select: { orgBadgeId: true, context: true, awardedAt: true },
    }),
  ])

  const countByOrgBadgeId = new Map<string, number>()
  const latestContextByOrgBadgeId = new Map<string, string>()
  for (const grant of grants) {
    countByOrgBadgeId.set(grant.orgBadgeId, (countByOrgBadgeId.get(grant.orgBadgeId) ?? 0) + 1)
    if (!latestContextByOrgBadgeId.has(grant.orgBadgeId)) {
      latestContextByOrgBadgeId.set(grant.orgBadgeId, grant.context)
    }
  }

  const itemsByFamily = new Map<BadgeFamily, PlayerBadgeVitrinaItemDto[]>()
  for (const family of BADGE_FAMILY_ORDER) {
    itemsByFamily.set(family, [])
  }

  let ganadasDistintas = 0

  for (const row of catalog) {
    const veces = countByOrgBadgeId.get(row.id) ?? 0
    let proximamente = false
    try {
      proximamente = !getBadgeDefinition(row.predicateId).evaluable
    } catch {
      proximamente = true
    }
    const locked = veces === 0 && !proximamente
    if (veces > 0) ganadasDistintas += 1

    const item: PlayerBadgeVitrinaItemDto = {
      predicateId: row.predicateId,
      name: row.name,
      description: row.description,
      rarity: row.rarity,
      iconKey: row.iconKey,
      locked,
      proximamente,
      veces,
      context: latestContextByOrgBadgeId.get(row.id) ?? null,
    }

    const family = row.family as BadgeFamily
    const bucket = itemsByFamily.get(family)
    if (bucket) {
      bucket.push(item)
    } else {
      itemsByFamily.set(family, [item])
    }
  }

  return {
    kind: 'ok',
    vitrina: {
      playerNombre: playerDisplayName(player),
      orgName: org.name,
      enabled: true,
      ganadasDistintas,
      totalCatalogo: catalog.length,
      familias: BADGE_FAMILY_ORDER.map((family) => ({
        family,
        label: BADGE_FAMILY_LABELS[family],
        items: itemsByFamily.get(family) ?? [],
      })).filter((section) => section.items.length > 0),
    },
  }
}

export async function getPlayerRecentBadges(
  organizationId: string,
  playerId: string,
  limit = 4,
): Promise<Array<{ rarity: string; iconKey: string; name: string }>> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { badgesEnabled: true },
  })
  if (!org?.badgesEnabled) return []

  const grants = await db.playerBadge.findMany({
    where: { playerId, organizationId },
    orderBy: { awardedAt: 'desc' },
    take: limit,
    include: {
      orgBadge: { select: { name: true, rarity: true, iconKey: true } },
    },
  })

  return grants.map((grant) => ({
    rarity: grant.orgBadge.rarity,
    iconKey: grant.orgBadge.iconKey,
    name: grant.orgBadge.name,
  }))
}
