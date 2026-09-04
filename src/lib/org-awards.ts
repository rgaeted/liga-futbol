import { db } from '@/lib/db'

export async function listActiveOrgAwards(organizationId: string) {
  return db.orgAward.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export async function listOrgAwardsWithCounts(organizationId: string) {
  return db.orgAward.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { playerAwards: true } } },
  })
}
