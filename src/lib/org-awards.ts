import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

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

export async function revalidateOrgAwardPages(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true },
  })
  if (!org) return
  revalidatePath(`/${org.slug}/admin/awards`, 'page')
  revalidatePath(`/${org.slug}`, 'page')
}
