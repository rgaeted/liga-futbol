import { listOrganizations } from '@/lib/organizations'
import { OrganizationCreateForm } from '@/components/plataforma/OrganizationCreateForm'
import { OrganizationStatusButton } from '@/components/plataforma/OrganizationStatusButton'

export const dynamic = 'force-dynamic'

export default async function PlataformaPage() {
  const organizations = await listOrganizations()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-900">Empresas</h1>
        <p className="mt-1 font-ui text-sm text-zinc-600">
          Gestiona las organizaciones que administran ligas en LigaLab.
        </p>
      </div>

      <OrganizationCreateForm />

      <section className="rounded-lg border border-zinc-200 bg-white">
        <ul className="divide-y divide-zinc-100">
          {organizations.map((org) => (
            <li key={org.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <p className="font-ui font-medium text-zinc-900">{org.name}</p>
                <p className="font-ui text-sm text-zinc-500">
                  /{org.slug} · {org.status === 'ACTIVE' ? 'Activa' : 'Pausada'} ·{' '}
                  {org._count.memberships} miembros
                </p>
              </div>
              <OrganizationStatusButton organizationId={org.id} status={org.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
