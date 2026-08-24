import Link from 'next/link'
import { listOrganizations } from '@/lib/organizations'
import { OrganizationCreateForm } from '@/components/plataforma/OrganizationCreateForm'
import { OrganizationStatusButton } from '@/components/plataforma/OrganizationStatusButton'
import { PlatformPageHeader, PlatformPanel, PlatformPanelInner } from '@/components/plataforma/platform-ui'

export const dynamic = 'force-dynamic'

export default async function PlataformaPage() {
  const organizations = await listOrganizations()
  const activeCount = organizations.filter((org) => org.status === 'ACTIVE').length

  return (
    <>
      <PlatformPageHeader
        eyebrow="Plataforma"
        title="Empresas"
        subtitle="Gestiona las organizaciones que administran ligas en LigaLab."
        status={`● ${activeCount} activas`}
      />

      <div className="grid gap-[18px]">
        <OrganizationCreateForm />

        <PlatformPanel>
          <PlatformPanelInner>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[22px] font-black text-[#E8E4D8]">Directorio</h2>
              <span className="text-xs text-[#8A938C]">{organizations.length} empresas</span>
            </div>
            {organizations.length === 0 ? (
              <p className="text-sm text-[#8e8e98]">Aún no hay empresas registradas.</p>
            ) : (
              <ul className="divide-y divide-[#f0f0f2]">
                {organizations.map((org) => (
                  <li
                    key={org.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-[#E8E4D8]">{org.name}</p>
                      <p className="text-sm text-[#8A938C]">
                        /{org.slug} · {org.status === 'ACTIVE' ? 'Activa' : 'Pausada'} ·{' '}
                        {org._count.memberships} miembros
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {org.status === 'ACTIVE' ? (
                        <>
                          <Link
                            href={`/${org.slug}`}
                            className="rounded-full border border-[#2A3A32] px-4 py-1.5 text-xs font-bold text-[#E8E4D8] hover:bg-[#0B1210]"
                          >
                            Ver landing
                          </Link>
                          <Link
                            href={`/${org.slug}/admin`}
                            className="rounded-full bg-org-primary px-4 py-1.5 text-xs font-bold text-[#0B1210] hover:opacity-90"
                          >
                            Ingresar
                          </Link>
                        </>
                      ) : null}
                      <OrganizationStatusButton organizationId={org.id} status={org.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PlatformPanelInner>
        </PlatformPanel>
      </div>
    </>
  )
}
