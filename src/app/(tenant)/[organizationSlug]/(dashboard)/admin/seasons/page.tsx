import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireOrganizationId } from '@/lib/tenant-access'
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">Temporadas</h1>
        <Link
          href={`/${organizationSlug}/admin/seasons/new`}
          className="rounded-lg bg-kelme-red px-4 py-2 text-sm font-semibold text-white hover:bg-kelme-red-dark"
        >
          Nueva temporada
        </Link>
      </div>
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
