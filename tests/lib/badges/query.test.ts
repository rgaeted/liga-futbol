import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  db: {
    organization: { findUnique: vi.fn() },
    player: { findFirst: vi.fn() },
    orgBadge: { findMany: vi.fn() },
    playerBadge: { findMany: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { BADGE_REGISTRY } from '@/lib/badges/registry'
import { getPlayerBadgeVitrina } from '@/lib/badges/query'

function catalogRow(index: number, predicateId: string) {
  const definition = BADGE_REGISTRY.find((row) => row.predicateId === predicateId)!
  return {
    id: `badge-${index}`,
    predicateId,
    name: definition.name,
    description: definition.description,
    family: definition.family,
    rarity: definition.rarity,
    iconKey: definition.iconKey,
    sortOrder: index,
  }
}

describe('getPlayerBadgeVitrina', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns not_found when badges are disabled', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: 'org1',
      name: 'Los Lunes',
      status: 'ACTIVE',
      badgesEnabled: false,
    } as never)

    const result = await getPlayerBadgeVitrina('loslunes', 'p1')

    expect(result).toEqual({ kind: 'not_found' })
    expect(db.player.findFirst).not.toHaveBeenCalled()
  })

  it('returns vitrina with 34 catalog items and grant counts', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: 'org1',
      name: 'Los Lunes',
      status: 'ACTIVE',
      badgesEnabled: true,
    } as never)
    vi.mocked(db.player.findFirst).mockResolvedValue({
      id: 'p1',
      person: { firstName: 'Fernando', lastName: 'Opitz' },
    } as never)

    const catalog = BADGE_REGISTRY.map((row, index) => catalogRow(index, row.predicateId))
    const hatTrickId = catalog.find((row) => row.predicateId === 'hat_trick')!.id
    const abrioLaLataId = catalog.find((row) => row.predicateId === 'abrio_la_lata')!.id

    vi.mocked(db.orgBadge.findMany).mockResolvedValue(catalog as never)
    vi.mocked(db.playerBadge.findMany).mockResolvedValue([
      { orgBadgeId: hatTrickId, context: "58' · Blancos 5-4", awardedAt: new Date('2026-09-07T23:30:00.000Z') },
      { orgBadgeId: hatTrickId, context: "40' · Blancos 3-1", awardedAt: new Date('2026-08-31T23:30:00.000Z') },
      { orgBadgeId: abrioLaLataId, context: "12' · Blancos 1-0", awardedAt: new Date('2026-09-01T23:30:00.000Z') },
    ] as never)

    const result = await getPlayerBadgeVitrina('loslunes', 'p1')

    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return

    const items = result.vitrina.familias.flatMap((section) => section.items)
    expect(items).toHaveLength(34)
    expect(result.vitrina.totalCatalogo).toBe(34)
    expect(result.vitrina.ganadasDistintas).toBe(2)

    const hatTrick = items.find((item) => item.predicateId === 'hat_trick')
    expect(hatTrick?.veces).toBe(2)
    expect(hatTrick?.context).toBe("58' · Blancos 5-4")
    expect(hatTrick?.locked).toBe(false)

    const proxima = items.find((item) => item.predicateId === 'de_todos_los_sabores')
    expect(proxima?.proximamente).toBe(true)
    expect(proxima?.locked).toBe(false)

    const locked = items.find((item) => item.predicateId === 'abrio_la_lata')
    expect(locked?.veces).toBe(1)
    expect(locked?.context).toBe("12' · Blancos 1-0")
  })
})
