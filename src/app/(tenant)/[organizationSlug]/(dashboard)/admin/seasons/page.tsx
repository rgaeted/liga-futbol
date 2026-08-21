import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireOrganizationId } from '@/lib/tenant-access'
import { SeasonForm } from '@/components/admin/SeasonForm'
import { SeasonsTable } from '@/components/admin/SeasonsTable'

export const dynamic = 'force-dynamic'

export default async function AdminSeasonsPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const seasons = await db.season.findMany({
    where: { organizationId },
    orderBy: { startDate: 'desc' },
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Temporadas</h1>
      <SeasonForm />
      <SeasonsTable
        seasons={seasons.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: s.startDate.toISOString().slice(0, 10),
          endDate: s.endDate.toISOString().slice(0, 10),
          footballFormat: s.footballFormat,
          isActive: s.isActive,
        }))}
      />
    </div>
  )
}
