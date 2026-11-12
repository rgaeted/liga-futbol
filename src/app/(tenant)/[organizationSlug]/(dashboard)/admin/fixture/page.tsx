import { notFound } from 'next/navigation'
import { FixtureAdmin } from '@/components/admin/fixture/FixtureAdmin'
import { requireOrganizationId } from '@/lib/tenant-access'
import {
  findFixtureSeasonId,
  getFixtureView,
  listFixtureAudit,
} from '@/lib/kelme-fixture/service'

export const dynamic = 'force-dynamic'

export default async function AdminFixturePage({
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

  const seasonId = await findFixtureSeasonId(organizationId)
  if (!seasonId) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-bold">Fixture</h1>
        <p className="text-sm text-kelme-gray-600">
          Aún no se ha cargado el fixture del torneo. Ejecuta el script{' '}
          <code className="rounded bg-kelme-gray-100 px-1.5 py-0.5">npm run db:seed:kelme-fixture</code>{' '}
          para crearlo.
        </p>
      </div>
    )
  }

  const [view, audit] = await Promise.all([getFixtureView(seasonId), listFixtureAudit(seasonId)])

  return <FixtureAdmin
      initialView={view}
      initialAudit={audit}
      exportHref={`/api/public/fixture/${organizationSlug}/export`}
    />
}
